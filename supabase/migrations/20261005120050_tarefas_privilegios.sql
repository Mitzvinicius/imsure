-- Parte B (tarefas): as funções *_de(p_usuario, ...) respondem "fulano enxerga tal registro?" e não podem
-- ficar expostas via RPC (qualquer logado sondaria a visibilidade de outras pessoas). As policies passam a usar
-- wrappers com auth.uid(); as funções internas só rodam dentro de funções security definer e triggers.

create or replace function public.usuario_ve_alvo(p_negocio_id uuid, p_apolice_id uuid, p_sinistro_id uuid, p_contato_id uuid, p_tarefa_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.ve_alvo_de((select auth.uid()), p_negocio_id, p_apolice_id, p_sinistro_id, p_contato_id, p_tarefa_id);
$$;

create or replace function public.usuario_ve_registro(p_negocio_id uuid, p_apolice_id uuid, p_sinistro_id uuid, p_contato_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.usuario_alvo_ve_registro((select auth.uid()), p_negocio_id, p_apolice_id, p_sinistro_id, p_contato_id);
$$;

create or replace function public.usuario_ve_tarefa_linha(p_corretora_id uuid, p_responsavel uuid, p_criado_por uuid,
  p_negocio_id uuid, p_apolice_id uuid, p_sinistro_id uuid, p_contato_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.ve_tarefa_linha((select auth.uid()), p_corretora_id, p_responsavel, p_criado_por, p_negocio_id, p_apolice_id, p_sinistro_id, p_contato_id);
$$;

-- Só o autor do comentário pergunta, e só sobre o próprio comentário
create or replace function public.pode_mencionar(p_comentario_id uuid, p_usuario uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.comentarios c
    where c.id = p_comentario_id
      and c.autor_usuario_id = (select auth.uid())
      and public.ve_alvo_de(p_usuario, c.negocio_id, c.apolice_id, c.sinistro_id, c.contato_id, c.tarefa_id)
  );
$$;

-- ===== Policies =====
drop policy ve_tarefa on public.tarefas;
drop policy cria_tarefa on public.tarefas;
drop policy edita_tarefa on public.tarefas;
drop policy exclui_tarefa on public.tarefas;
create policy ve_tarefa on public.tarefas for select to authenticated
  using (public.usuario_ve_tarefa_linha(corretora_id, responsavel_usuario_id, criado_por, negocio_id, apolice_id, sinistro_id, contato_id));
create policy cria_tarefa on public.tarefas for insert to authenticated
  with check (
    criado_por = (select auth.uid())
    and public.usuario_possui_corretora(corretora_id)
    and (num_nonnulls(negocio_id, apolice_id, sinistro_id, contato_id) = 0
         or public.usuario_ve_registro(negocio_id, apolice_id, sinistro_id, contato_id))
  );
create policy edita_tarefa on public.tarefas for update to authenticated
  using (
    public.usuario_ve_tarefa_linha(corretora_id, responsavel_usuario_id, criado_por, negocio_id, apolice_id, sinistro_id, contato_id)
    and (responsavel_usuario_id = (select auth.uid()) or criado_por = (select auth.uid()) or public.escopo_usuario(corretora_id) = 'tudo')
  )
  with check (
    public.usuario_possui_corretora(corretora_id)
    and (num_nonnulls(negocio_id, apolice_id, sinistro_id, contato_id) = 0
         or public.usuario_ve_registro(negocio_id, apolice_id, sinistro_id, contato_id))
  );
create policy exclui_tarefa on public.tarefas for delete to authenticated
  using (
    public.usuario_ve_tarefa_linha(corretora_id, responsavel_usuario_id, criado_por, negocio_id, apolice_id, sinistro_id, contato_id)
    and (criado_por = (select auth.uid()) or public.escopo_usuario(corretora_id) = 'tudo')
  );

drop policy ve_comentario on public.comentarios;
drop policy cria_comentario on public.comentarios;
create policy ve_comentario on public.comentarios for select to authenticated
  using (public.usuario_ve_alvo(negocio_id, apolice_id, sinistro_id, contato_id, tarefa_id));
create policy cria_comentario on public.comentarios for insert to authenticated
  with check (autor_usuario_id = (select auth.uid()) and public.usuario_ve_alvo(negocio_id, apolice_id, sinistro_id, contato_id, tarefa_id));

drop policy autor_menciona on public.comentario_mencoes;
create policy autor_menciona on public.comentario_mencoes for insert to authenticated
  with check (public.pode_mencionar(comentario_id, usuario_id));

-- comentar (security invoker) não chama mais ve_alvo_de: a policy de menções é quem recusa
create or replace function public.comentar(
  p_corretora_id uuid, p_texto text, p_mencoes uuid[] default '{}',
  p_negocio_id uuid default null, p_apolice_id uuid default null, p_sinistro_id uuid default null,
  p_contato_id uuid default null, p_tarefa_id uuid default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.comentarios (corretora_id, autor_usuario_id, texto, negocio_id, apolice_id, sinistro_id, contato_id, tarefa_id)
  values (p_corretora_id, (select auth.uid()), btrim(p_texto), p_negocio_id, p_apolice_id, p_sinistro_id, p_contato_id, p_tarefa_id)
  returning id into v_id;
  begin
    insert into public.comentario_mencoes (comentario_id, usuario_id)
    select distinct v_id, u from unnest(coalesce(p_mencoes, '{}')) u where u <> (select auth.uid());
  exception when insufficient_privilege then
    raise exception 'Você mencionou alguém que não tem acesso a este registro.' using errcode = '42501';
  end;
  return v_id;
end;
$$;

-- ===== Privilégios =====
revoke execute on function
  public.escopo_de(uuid, uuid), public.ve_responsavel_de(uuid, uuid, uuid), public.ve_negocio_de(uuid, uuid),
  public.possui_apolice_de(uuid, uuid), public.ve_sinistro_de(uuid, uuid), public.ve_contato_de(uuid, uuid),
  public.usuario_alvo_ve_registro(uuid, uuid, uuid, uuid, uuid), public.corretora_do_alvo(uuid, uuid, uuid, uuid, uuid),
  public.ve_tarefa_de(uuid, uuid), public.ve_alvo_de(uuid, uuid, uuid, uuid, uuid, uuid),
  public.ve_tarefa_linha(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid)
from public, anon, authenticated;

revoke execute on function
  public.usuario_ve_alvo(uuid, uuid, uuid, uuid, uuid), public.usuario_ve_registro(uuid, uuid, uuid, uuid),
  public.usuario_ve_tarefa_linha(uuid, uuid, uuid, uuid, uuid, uuid, uuid), public.pode_mencionar(uuid, uuid)
from public, anon;
grant execute on function
  public.usuario_ve_alvo(uuid, uuid, uuid, uuid, uuid), public.usuario_ve_registro(uuid, uuid, uuid, uuid),
  public.usuario_ve_tarefa_linha(uuid, uuid, uuid, uuid, uuid, uuid, uuid), public.pode_mencionar(uuid, uuid)
to authenticated;
