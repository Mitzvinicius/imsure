-- Parte B (tarefas): visibilidade "para um usuário qualquer", tarefas, comentários e menções.

-- ===== Visibilidade para um usuário qualquer =====
-- Fonte única de verdade: as funções da parte A passam a ser wrappers com auth.uid().
-- As variantes *_de servem para validar responsável e menções ("essa pessoa consegue ver o registro?").
create or replace function public.escopo_de(p_usuario uuid, p_corretora_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select c.escopo from public.usuario_corretora uc join public.cargos c on c.id = uc.cargo_id
  where uc.corretora_id = p_corretora_id and uc.usuario_id = p_usuario and uc.ativo;
$$;

create or replace function public.ve_responsavel_de(p_usuario uuid, p_corretora_id uuid, p_responsavel uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case coalesce(public.escopo_de(p_usuario, p_corretora_id), 'nenhum')
    when 'tudo' then true
    when 'nenhum' then false
    else p_responsavel = p_usuario
      or exists (
        select 1 from public.equipe_membros eu
        join public.equipe_membros er on er.equipe_id = eu.equipe_id
        join public.equipes e on e.id = eu.equipe_id
        where e.corretora_id = p_corretora_id
          and eu.usuario_id = p_usuario
          and er.usuario_id = p_responsavel
          and (eu.lider or public.escopo_de(p_usuario, p_corretora_id) = 'equipe')
      )
  end;
$$;

create or replace function public.ve_negocio_de(p_usuario uuid, p_negocio_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.negocios n
    join public.etapas e on e.id = n.etapa_id
    join public.fluxos f on f.id = e.fluxo_id
    where n.id = p_negocio_id and public.ve_responsavel_de(p_usuario, f.corretora_id, n.vendedor_usuario_id)
  );
$$;

create or replace function public.possui_apolice_de(p_usuario uuid, p_apolice_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.apolices a
    where a.id = p_apolice_id and public.ve_responsavel_de(p_usuario, a.corretora_id, a.responsavel_usuario_id)
  );
$$;

create or replace function public.ve_sinistro_de(p_usuario uuid, p_sinistro_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sinistros s where s.id = p_sinistro_id and public.possui_apolice_de(p_usuario, s.apolice_id));
$$;

create or replace function public.ve_contato_de(p_usuario uuid, p_contato_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.contatos c
    where c.id = p_contato_id
      and public.escopo_de(p_usuario, c.corretora_id) is not null
      and (
        public.escopo_de(p_usuario, c.corretora_id) = 'tudo'
        or c.criado_por_usuario_id = p_usuario
        or exists (select 1 from public.apolices a where a.contato_id = c.id and public.ve_responsavel_de(p_usuario, c.corretora_id, a.responsavel_usuario_id))
        or exists (select 1 from public.negocios n where n.contato_id = c.id and public.ve_responsavel_de(p_usuario, c.corretora_id, n.vendedor_usuario_id))
      )
  );
$$;

create or replace function public.escopo_usuario(p_corretora_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select public.escopo_de((select auth.uid()), p_corretora_id);
$$;
create or replace function public.usuario_ve_responsavel(p_corretora_id uuid, p_responsavel uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.ve_responsavel_de((select auth.uid()), p_corretora_id, p_responsavel);
$$;
create or replace function public.usuario_ve_negocio(p_negocio_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.ve_negocio_de((select auth.uid()), p_negocio_id);
$$;
create or replace function public.usuario_possui_apolice(p_apolice_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.possui_apolice_de((select auth.uid()), p_apolice_id);
$$;
create or replace function public.usuario_ve_contato(p_contato_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.ve_contato_de((select auth.uid()), p_contato_id);
$$;

create or replace function public.usuario_alvo_ve_registro(p_usuario uuid, p_negocio_id uuid, p_apolice_id uuid, p_sinistro_id uuid, p_contato_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when p_negocio_id is not null then public.ve_negocio_de(p_usuario, p_negocio_id)
    when p_apolice_id is not null then public.possui_apolice_de(p_usuario, p_apolice_id)
    when p_sinistro_id is not null then public.ve_sinistro_de(p_usuario, p_sinistro_id)
    when p_contato_id is not null then public.ve_contato_de(p_usuario, p_contato_id)
    else false
  end;
$$;


-- ===== Tarefas =====
create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  titulo text not null constraint tarefas_titulo_check check (length(btrim(titulo)) between 1 and 200),
  descricao text,
  responsavel_usuario_id uuid not null constraint tarefas_responsavel_usuario_id_fkey references public.usuarios(id),
  criado_por uuid not null default auth.uid() constraint tarefas_criado_por_fkey references public.usuarios(id),
  prazo date,
  prazo_hora time,
  prioridade text not null default 'media' constraint tarefas_prioridade_check check (prioridade in ('baixa','media','alta')),
  status text not null default 'a_fazer' constraint tarefas_status_check check (status in ('a_fazer','em_andamento','concluida','cancelada')),
  concluida_em timestamptz,
  negocio_id uuid references public.negocios(id) on delete cascade,
  apolice_id uuid references public.apolices(id) on delete cascade,
  sinistro_id uuid references public.sinistros(id) on delete cascade,
  contato_id uuid references public.contatos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint tarefas_um_vinculo check (num_nonnulls(negocio_id, apolice_id, sinistro_id, contato_id) <= 1),
  constraint tarefas_hora_exige_prazo check (prazo_hora is null or prazo is not null)
);
create index tarefas_corretora_status_idx on public.tarefas (corretora_id, status);
create index tarefas_responsavel_status_idx on public.tarefas (responsavel_usuario_id, status);
create index tarefas_criado_por_idx on public.tarefas (criado_por);
create index tarefas_negocio_idx on public.tarefas (negocio_id) where negocio_id is not null;
create index tarefas_apolice_idx on public.tarefas (apolice_id) where apolice_id is not null;
create index tarefas_sinistro_idx on public.tarefas (sinistro_id) where sinistro_id is not null;
create index tarefas_contato_idx on public.tarefas (contato_id) where contato_id is not null;
create index tarefas_prazo_abertas_idx on public.tarefas (prazo) where status in ('a_fazer','em_andamento');

-- language sql valida as tabelas citadas: precisa vir depois de create table tarefas
create or replace function public.corretora_do_alvo(p_negocio_id uuid, p_apolice_id uuid, p_sinistro_id uuid, p_contato_id uuid, p_tarefa_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select case
    when p_negocio_id is not null then (select f.corretora_id from public.negocios n join public.etapas e on e.id = n.etapa_id join public.fluxos f on f.id = e.fluxo_id where n.id = p_negocio_id)
    when p_apolice_id is not null then (select corretora_id from public.apolices where id = p_apolice_id)
    when p_sinistro_id is not null then (select a.corretora_id from public.sinistros s join public.apolices a on a.id = s.apolice_id where s.id = p_sinistro_id)
    when p_contato_id is not null then (select corretora_id from public.contatos where id = p_contato_id)
    when p_tarefa_id is not null then (select corretora_id from public.tarefas where id = p_tarefa_id)
  end;
$$;

-- Recebe as colunas (não o id): as policies chamam com a própria linha. Buscar por id falharia no
-- insert ... returning, porque a linha recém-inserida não é visível dentro da função.
create or replace function public.ve_tarefa_linha(p_usuario uuid, p_corretora_id uuid, p_responsavel uuid, p_criado_por uuid,
  p_negocio_id uuid, p_apolice_id uuid, p_sinistro_id uuid, p_contato_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.escopo_de(p_usuario, p_corretora_id) is not null
    and (
      p_responsavel = p_usuario
      or p_criado_por = p_usuario
      or case when num_nonnulls(p_negocio_id, p_apolice_id, p_sinistro_id, p_contato_id) = 0
           then public.ve_responsavel_de(p_usuario, p_corretora_id, p_responsavel)
           else public.usuario_alvo_ve_registro(p_usuario, p_negocio_id, p_apolice_id, p_sinistro_id, p_contato_id)
         end
    );
$$;

create or replace function public.ve_tarefa_de(p_usuario uuid, p_tarefa_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select public.ve_tarefa_linha(p_usuario, t.corretora_id, t.responsavel_usuario_id, t.criado_por, t.negocio_id, t.apolice_id, t.sinistro_id, t.contato_id)
    from public.tarefas t where t.id = p_tarefa_id
  ), false);
$$;

create or replace function public.ve_alvo_de(p_usuario uuid, p_negocio_id uuid, p_apolice_id uuid, p_sinistro_id uuid, p_contato_id uuid, p_tarefa_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when p_tarefa_id is not null then public.ve_tarefa_de(p_usuario, p_tarefa_id)
              else public.usuario_alvo_ve_registro(p_usuario, p_negocio_id, p_apolice_id, p_sinistro_id, p_contato_id) end;
$$;

-- Integridade: corretora vem do registro; criado_por imutável; concluida_em automático; responsável precisa enxergar o registro
create or replace function public.tarefas_antes_gravar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_corretora uuid;
begin
  v_corretora := public.corretora_do_alvo(new.negocio_id, new.apolice_id, new.sinistro_id, new.contato_id, null);
  if v_corretora is not null then
    if new.corretora_id is not null and new.corretora_id <> v_corretora then
      raise exception 'O registro vinculado pertence a outra corretora.' using errcode = '23514';
    end if;
    new.corretora_id := v_corretora;
  end if;
  if tg_op = 'UPDATE' then
    if new.corretora_id <> old.corretora_id then
      raise exception 'Não é possível mover a tarefa para outra corretora.' using errcode = '23514';
    end if;
    new.criado_por := old.criado_por;
    new.criado_em := old.criado_em;
    new.atualizado_em := now();
  end if;
  if new.status = 'concluida' then
    if tg_op = 'INSERT' or old.status <> 'concluida' then new.concluida_em := now(); end if;
  else
    new.concluida_em := null;
  end if;
  if (select auth.uid()) is not null and (
       tg_op = 'INSERT'
       or new.responsavel_usuario_id is distinct from old.responsavel_usuario_id
       or row(new.negocio_id, new.apolice_id, new.sinistro_id, new.contato_id) is distinct from row(old.negocio_id, old.apolice_id, old.sinistro_id, old.contato_id)
     ) then
    if num_nonnulls(new.negocio_id, new.apolice_id, new.sinistro_id, new.contato_id) = 0 then
      if public.escopo_de(new.responsavel_usuario_id, new.corretora_id) is null then
        raise exception 'O responsável precisa ser um membro ativo da corretora.' using errcode = '42501';
      end if;
    elsif not public.usuario_alvo_ve_registro(new.responsavel_usuario_id, new.negocio_id, new.apolice_id, new.sinistro_id, new.contato_id) then
      raise exception 'Essa pessoa não tem acesso ao registro desta tarefa. Escolha alguém que consiga abri-lo.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger tarefas_antes_gravar before insert or update on public.tarefas
  for each row execute function public.tarefas_antes_gravar();

alter table public.tarefas enable row level security;
create policy ve_tarefa on public.tarefas for select to authenticated
  using (public.ve_tarefa_linha((select auth.uid()), corretora_id, responsavel_usuario_id, criado_por, negocio_id, apolice_id, sinistro_id, contato_id));
create policy cria_tarefa on public.tarefas for insert to authenticated
  with check (
    criado_por = (select auth.uid())
    and public.usuario_possui_corretora(corretora_id)
    and (num_nonnulls(negocio_id, apolice_id, sinistro_id, contato_id) = 0
         or public.usuario_alvo_ve_registro((select auth.uid()), negocio_id, apolice_id, sinistro_id, contato_id))
  );
create policy edita_tarefa on public.tarefas for update to authenticated
  using (
    public.ve_tarefa_linha((select auth.uid()), corretora_id, responsavel_usuario_id, criado_por, negocio_id, apolice_id, sinistro_id, contato_id)
    and (responsavel_usuario_id = (select auth.uid()) or criado_por = (select auth.uid()) or public.escopo_usuario(corretora_id) = 'tudo')
  )
  with check (
    public.usuario_possui_corretora(corretora_id)
    and (num_nonnulls(negocio_id, apolice_id, sinistro_id, contato_id) = 0
         or public.usuario_alvo_ve_registro((select auth.uid()), negocio_id, apolice_id, sinistro_id, contato_id))
  );
create policy exclui_tarefa on public.tarefas for delete to authenticated
  using (public.ve_tarefa_linha((select auth.uid()), corretora_id, responsavel_usuario_id, criado_por, negocio_id, apolice_id, sinistro_id, contato_id) and (criado_por = (select auth.uid()) or public.escopo_usuario(corretora_id) = 'tudo'));

-- ===== Comentários =====
create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  autor_usuario_id uuid not null constraint comentarios_autor_usuario_id_fkey references public.usuarios(id),
  texto text not null constraint comentarios_texto_check check (length(btrim(texto)) > 0),
  negocio_id uuid references public.negocios(id) on delete cascade,
  apolice_id uuid references public.apolices(id) on delete cascade,
  sinistro_id uuid references public.sinistros(id) on delete cascade,
  contato_id uuid references public.contatos(id) on delete cascade,
  tarefa_id uuid references public.tarefas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  editado_em timestamptz,
  constraint comentarios_um_alvo check (num_nonnulls(negocio_id, apolice_id, sinistro_id, contato_id, tarefa_id) = 1)
);
create index comentarios_corretora_idx on public.comentarios (corretora_id);
create index comentarios_autor_idx on public.comentarios (autor_usuario_id);
create index comentarios_negocio_idx on public.comentarios (negocio_id, criado_em) where negocio_id is not null;
create index comentarios_apolice_idx on public.comentarios (apolice_id, criado_em) where apolice_id is not null;
create index comentarios_sinistro_idx on public.comentarios (sinistro_id, criado_em) where sinistro_id is not null;
create index comentarios_contato_idx on public.comentarios (contato_id, criado_em) where contato_id is not null;
create index comentarios_tarefa_idx on public.comentarios (tarefa_id, criado_em) where tarefa_id is not null;

create or replace function public.comentarios_antes_gravar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_corretora uuid;
begin
  if tg_op = 'UPDATE' then
    -- só o texto muda
    new.id := old.id; new.corretora_id := old.corretora_id; new.autor_usuario_id := old.autor_usuario_id;
    new.negocio_id := old.negocio_id; new.apolice_id := old.apolice_id; new.sinistro_id := old.sinistro_id;
    new.contato_id := old.contato_id; new.tarefa_id := old.tarefa_id; new.criado_em := old.criado_em;
    if new.texto is distinct from old.texto then new.editado_em := now(); end if;
    return new;
  end if;
  v_corretora := public.corretora_do_alvo(new.negocio_id, new.apolice_id, new.sinistro_id, new.contato_id, new.tarefa_id);
  if v_corretora is null or (new.corretora_id is not null and new.corretora_id <> v_corretora) then
    raise exception 'O registro comentado pertence a outra corretora.' using errcode = '23514';
  end if;
  new.corretora_id := v_corretora;
  return new;
end;
$$;
create trigger comentarios_antes_gravar before insert or update on public.comentarios
  for each row execute function public.comentarios_antes_gravar();

alter table public.comentarios enable row level security;
create policy ve_comentario on public.comentarios for select to authenticated
  using (public.ve_alvo_de((select auth.uid()), negocio_id, apolice_id, sinistro_id, contato_id, tarefa_id));
create policy cria_comentario on public.comentarios for insert to authenticated
  with check (autor_usuario_id = (select auth.uid()) and public.ve_alvo_de((select auth.uid()), negocio_id, apolice_id, sinistro_id, contato_id, tarefa_id));
create policy autor_edita_comentario on public.comentarios for update to authenticated
  using (autor_usuario_id = (select auth.uid())) with check (autor_usuario_id = (select auth.uid()));
create policy autor_exclui_comentario on public.comentarios for delete to authenticated
  using (autor_usuario_id = (select auth.uid()));

-- ===== Menções =====
create table public.comentario_mencoes (
  comentario_id uuid not null references public.comentarios(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  primary key (comentario_id, usuario_id)
);
create index comentario_mencoes_usuario_idx on public.comentario_mencoes (usuario_id);
alter table public.comentario_mencoes enable row level security;
create policy ve_mencao on public.comentario_mencoes for select to authenticated
  using (exists (select 1 from public.comentarios c where c.id = comentario_id));
create policy autor_menciona on public.comentario_mencoes for insert to authenticated
  with check (exists (
    select 1 from public.comentarios c
    where c.id = comentario_id
      and c.autor_usuario_id = (select auth.uid())
      and public.ve_alvo_de(comentario_mencoes.usuario_id, c.negocio_id, c.apolice_id, c.sinistro_id, c.contato_id, c.tarefa_id)
  ));

revoke execute on function
  public.escopo_de(uuid, uuid), public.ve_responsavel_de(uuid, uuid, uuid), public.ve_negocio_de(uuid, uuid),
  public.possui_apolice_de(uuid, uuid), public.ve_sinistro_de(uuid, uuid), public.ve_contato_de(uuid, uuid),
  public.usuario_alvo_ve_registro(uuid, uuid, uuid, uuid, uuid), public.corretora_do_alvo(uuid, uuid, uuid, uuid, uuid),
  public.ve_tarefa_de(uuid, uuid), public.ve_alvo_de(uuid, uuid, uuid, uuid, uuid, uuid),
  public.ve_tarefa_linha(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid)
from public, anon;
grant execute on function
  public.escopo_de(uuid, uuid), public.ve_responsavel_de(uuid, uuid, uuid), public.ve_negocio_de(uuid, uuid),
  public.possui_apolice_de(uuid, uuid), public.ve_sinistro_de(uuid, uuid), public.ve_contato_de(uuid, uuid),
  public.usuario_alvo_ve_registro(uuid, uuid, uuid, uuid, uuid), public.corretora_do_alvo(uuid, uuid, uuid, uuid, uuid),
  public.ve_tarefa_de(uuid, uuid), public.ve_alvo_de(uuid, uuid, uuid, uuid, uuid, uuid),
  public.ve_tarefa_linha(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid)
to authenticated;
revoke execute on function public.tarefas_antes_gravar(), public.comentarios_antes_gravar() from public, anon, authenticated;

-- ===== RPCs =====
-- Comentário + menções numa transação só: menção recusada não deixa comentário órfão
create or replace function public.comentar(
  p_corretora_id uuid, p_texto text, p_mencoes uuid[] default '{}',
  p_negocio_id uuid default null, p_apolice_id uuid default null, p_sinistro_id uuid default null,
  p_contato_id uuid default null, p_tarefa_id uuid default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
  if exists (select 1 from unnest(coalesce(p_mencoes, '{}')) u
             where not public.ve_alvo_de(u, p_negocio_id, p_apolice_id, p_sinistro_id, p_contato_id, p_tarefa_id)) then
    raise exception 'Você mencionou alguém que não tem acesso a este registro.' using errcode = '42501';
  end if;
  insert into public.comentarios (corretora_id, autor_usuario_id, texto, negocio_id, apolice_id, sinistro_id, contato_id, tarefa_id)
  values (p_corretora_id, (select auth.uid()), btrim(p_texto), p_negocio_id, p_apolice_id, p_sinistro_id, p_contato_id, p_tarefa_id)
  returning id into v_id;
  insert into public.comentario_mencoes (comentario_id, usuario_id)
  select distinct v_id, u from unnest(coalesce(p_mencoes, '{}')) u where u <> (select auth.uid());
  return v_id;
end;
$$;

-- Quem pode ser responsável/mencionado: membros ativos que enxergam o registro (avulsa: todos os ativos)
create or replace function public.membros_que_veem_registro(
  p_corretora_id uuid, p_negocio_id uuid default null, p_apolice_id uuid default null, p_sinistro_id uuid default null,
  p_contato_id uuid default null, p_tarefa_id uuid default null
) returns table (id uuid, nome text) language sql stable security definer set search_path = '' as $$
  select u.id, u.nome
  from public.usuario_corretora uc join public.usuarios u on u.id = uc.usuario_id
  where uc.corretora_id = p_corretora_id and uc.ativo
    and public.usuario_possui_corretora(p_corretora_id)
    and (
      num_nonnulls(p_negocio_id, p_apolice_id, p_sinistro_id, p_contato_id, p_tarefa_id) = 0
      or (public.ve_alvo_de((select auth.uid()), p_negocio_id, p_apolice_id, p_sinistro_id, p_contato_id, p_tarefa_id)
          and public.ve_alvo_de(uc.usuario_id, p_negocio_id, p_apolice_id, p_sinistro_id, p_contato_id, p_tarefa_id))
    )
  order by u.nome;
$$;

-- Busca de registro para vincular uma tarefa (RLS de cada tabela vale: security invoker)
create or replace function public.buscar_registros(p_corretora_id uuid, p_termo text)
returns table (tipo text, id uuid, rotulo text) language sql stable security invoker set search_path = '' as $$
  with t as (select '%' || replace(replace(replace(btrim(p_termo), '\', '\\'), '%', '\%'), '_', '\_') || '%' as termo)
  select * from (
    select 'apolice'::text, a.id, 'Apólice ' || a.numero || ' · ' || c.nome
    from public.apolices a join public.contatos c on c.id = a.contato_id, t
    where a.corretora_id = p_corretora_id and (a.numero ilike t.termo or c.nome ilike t.termo)
    union all
    select 'contato', c.id, c.nome
    from public.contatos c, t
    where c.corretora_id = p_corretora_id and c.nome ilike t.termo and public.usuario_ve_contato(c.id)
    union all
    select 'negocio', n.id, 'Negócio ' || n.ramo || ' · ' || c.nome
    from public.negocios n join public.contatos c on c.id = n.contato_id, t
    where c.corretora_id = p_corretora_id and c.nome ilike t.termo
    union all
    select 'sinistro', s.id, 'Sinistro ' || s.tipo || ' · ' || c.nome
    from public.sinistros s join public.apolices a on a.id = s.apolice_id join public.contatos c on c.id = a.contato_id, t
    where a.corretora_id = p_corretora_id and (a.numero ilike t.termo or c.nome ilike t.termo)
  ) r (tipo, id, rotulo)
  order by tipo, rotulo
  limit 30;
$$;

revoke execute on function public.comentar(uuid, text, uuid[], uuid, uuid, uuid, uuid, uuid),
  public.membros_que_veem_registro(uuid, uuid, uuid, uuid, uuid, uuid), public.buscar_registros(uuid, text) from public, anon;
grant execute on function public.comentar(uuid, text, uuid[], uuid, uuid, uuid, uuid, uuid),
  public.membros_que_veem_registro(uuid, uuid, uuid, uuid, uuid, uuid), public.buscar_registros(uuid, text) to authenticated;

-- ===== Anotações do negócio viram comentários (autor e data preservados) =====
insert into public.comentarios (corretora_id, autor_usuario_id, texto, negocio_id, criado_em)
select f.corretora_id, a.usuario_id, a.texto, a.negocio_id, a.criado_em
from public.negocio_anotacoes a
join public.negocios n on n.id = a.negocio_id
join public.etapas e on e.id = n.etapa_id
join public.fluxos f on f.id = e.fluxo_id
where exists (select 1 from public.usuarios u where u.id = a.usuario_id) and length(btrim(a.texto)) > 0;
comment on table public.negocio_anotacoes is 'Obsoleta desde 2026-10 (migrada para comentarios). Remover em migração posterior.';
