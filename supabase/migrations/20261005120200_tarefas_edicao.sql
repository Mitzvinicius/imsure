-- Parte B (tarefas), achados da revisão final:
-- 1) o responsável não conseguia repassar a tarefa para alguém fora da própria visibilidade (o Postgres checa a
--    policy de leitura na linha nova do UPDATE e ele deixa de enxergá-la);
-- 2) quem continua responsável/criador mas perdeu acesso ao registro vinculado não conseguia concluir nem reatribuir.
-- Edição passa por funções security definer com as checagens explícitas; o trigger tarefas_antes_gravar continua
-- validando o novo responsável (auth.uid() segue o usuário que chamou).

create or replace function public.pode_editar_tarefa(p_usuario uuid, p_tarefa_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tarefas t
    where t.id = p_tarefa_id
      and public.ve_tarefa_de(p_usuario, t.id)
      and (t.responsavel_usuario_id = p_usuario or t.criado_por = p_usuario or public.escopo_de(p_usuario, t.corretora_id) = 'tudo')
  );
$$;

create or replace function public.atualizar_tarefa(
  p_tarefa_id uuid, p_titulo text, p_descricao text, p_responsavel uuid,
  p_prazo date, p_prazo_hora time, p_prioridade text, p_status text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.pode_editar_tarefa((select auth.uid()), p_tarefa_id) then
    raise exception 'Você não pode editar esta tarefa.' using errcode = '42501';
  end if;
  update public.tarefas set
    titulo = btrim(p_titulo), descricao = nullif(btrim(p_descricao), ''), responsavel_usuario_id = p_responsavel,
    prazo = p_prazo, prazo_hora = case when p_prazo is null then null else p_prazo_hora end,
    prioridade = p_prioridade, status = p_status
  where id = p_tarefa_id;
end;
$$;

create or replace function public.alterar_status_tarefa(p_tarefa_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.pode_editar_tarefa((select auth.uid()), p_tarefa_id) then
    raise exception 'Você não pode alterar esta tarefa.' using errcode = '42501';
  end if;
  update public.tarefas set status = p_status where id = p_tarefa_id;
end;
$$;

-- Quem pode assumir uma tarefa existente: membros ativos que enxergam o registro dela (avulsa: todos os ativos).
-- Só responde para quem enxerga a tarefa — mesmo que tenha perdido acesso ao registro.
create or replace function public.responsaveis_possiveis(p_tarefa_id uuid)
returns table (id uuid, nome text) language sql stable security definer set search_path = '' as $$
  select u.id, u.nome
  from public.tarefas t
  join public.usuario_corretora uc on uc.corretora_id = t.corretora_id and uc.ativo
  join public.usuarios u on u.id = uc.usuario_id
  where t.id = p_tarefa_id
    and public.ve_tarefa_de((select auth.uid()), t.id)
    and (num_nonnulls(t.negocio_id, t.apolice_id, t.sinistro_id, t.contato_id) = 0
         or public.usuario_alvo_ve_registro(uc.usuario_id, t.negocio_id, t.apolice_id, t.sinistro_id, t.contato_id))
  order by u.nome;
$$;

revoke execute on function public.pode_editar_tarefa(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.atualizar_tarefa(uuid, text, text, uuid, date, time, text, text),
  public.alterar_status_tarefa(uuid, text), public.responsaveis_possiveis(uuid) from public, anon;
grant execute on function public.atualizar_tarefa(uuid, text, text, uuid, date, time, text, text),
  public.alterar_status_tarefa(uuid, text), public.responsaveis_possiveis(uuid) to authenticated;
