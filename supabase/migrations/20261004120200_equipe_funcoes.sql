-- ===== Uso do plano =====
create or replace function public.uso_usuarios_conta(p_corretora_id uuid)
returns table(usados int, limite int, plano text)
language sql stable security definer set search_path = '' as $$
  with conta as (
    select ct.id, ct.usuarios_extras, p.limite_usuarios, p.nome
    from public.corretoras c join public.contas ct on ct.id = c.conta_id join public.planos p on p.id = ct.plano_id
    where c.id = p_corretora_id
  ),
  membros as (
    select distinct lower(u.email) as email
    from public.usuario_corretora uc join public.corretoras c on c.id = uc.corretora_id join public.usuarios u on u.id = uc.usuario_id
    where c.conta_id = (select id from conta) and uc.ativo
  ),
  pendentes as (
    select distinct lower(cv.email) as email
    from public.convites cv join public.corretoras c on c.id = cv.corretora_id
    where c.conta_id = (select id from conta) and cv.aceito_em is null and cv.cancelado_em is null and cv.expira_em > now()
      and lower(cv.email) not in (select email from membros)
  )
  select ((select count(*) from membros) + (select count(*) from pendentes))::int,
         (select coalesce(limite_usuarios, 0) + usuarios_extras from conta)::int,
         (select nome from conta);
$$;

-- ===== Convites =====
create or replace function public.criar_convite(p_corretora_id uuid, p_email text, p_cargo_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(trim(p_email)); v_token text; v_uso record;
begin
  if not public.usuario_pode(p_corretora_id, 'equipe.membros') then
    raise exception 'Você não tem permissão para convidar pessoas.' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido.'; end if;
  if not exists (select 1 from public.cargos where id = p_cargo_id and corretora_id = p_corretora_id) then raise exception 'Cargo inválido.'; end if;
  if exists (select 1 from public.usuario_corretora uc join public.usuarios u on u.id = uc.usuario_id
             where uc.corretora_id = p_corretora_id and lower(u.email) = v_email and uc.ativo) then
    raise exception 'Essa pessoa já faz parte da equipe.';
  end if;
  if exists (select 1 from public.convites where corretora_id = p_corretora_id and lower(email) = v_email and aceito_em is null and cancelado_em is null and expira_em > now()) then
    raise exception 'Já existe um convite pendente para esse e-mail. Gere um novo link na lista de convites.';
  end if;
  -- convite expirado antigo libera o índice único
  update public.convites set cancelado_em = now()
  where corretora_id = p_corretora_id and lower(email) = v_email and aceito_em is null and cancelado_em is null;

  select * into v_uso from public.uso_usuarios_conta(p_corretora_id);
  if v_uso.usados >= v_uso.limite and not exists (
       select 1 from public.usuario_corretora uc join public.usuarios u on u.id = uc.usuario_id join public.corretoras c on c.id = uc.corretora_id
       where c.conta_id = (select conta_id from public.corretoras where id = p_corretora_id) and uc.ativo and lower(u.email) = v_email) then
    raise exception 'Seu plano % permite % usuários (% em uso). Mude de plano para adicionar mais.', v_uso.plano, v_uso.limite, v_uso.usados;
  end if;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.convites (corretora_id, email, cargo_id, token_hash, criado_por)
  values (p_corretora_id, v_email, p_cargo_id, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), (select auth.uid()));
  return v_token;
end;
$$;

create or replace function public.regenerar_convite(p_convite_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_corretora uuid; v_token text;
begin
  select corretora_id into v_corretora from public.convites where id = p_convite_id and aceito_em is null and cancelado_em is null;
  if v_corretora is null then raise exception 'Convite não encontrado ou já usado.'; end if;
  if not public.usuario_pode(v_corretora, 'equipe.membros') then raise exception 'Você não tem permissão.' using errcode = '42501'; end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  update public.convites set token_hash = encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), expira_em = now() + interval '7 days' where id = p_convite_id;
  return v_token;
end;
$$;

create or replace function public.cancelar_convite(p_convite_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_corretora uuid;
begin
  select corretora_id into v_corretora from public.convites where id = p_convite_id and aceito_em is null and cancelado_em is null;
  if v_corretora is null then raise exception 'Convite não encontrado ou já usado.'; end if;
  if not public.usuario_pode(v_corretora, 'equipe.membros') then raise exception 'Você não tem permissão.' using errcode = '42501'; end if;
  update public.convites set cancelado_em = now() where id = p_convite_id;
end;
$$;

create or replace function public.info_convite(p_token text)
returns table(corretora_nome text, cargo_nome text, convidado_por text, email text, situacao text)
language sql stable security definer set search_path = '' as $$
  select c.nome, cg.nome, u.nome, cv.email,
    case when cv.aceito_em is not null then 'aceito'
         when cv.cancelado_em is not null then 'cancelado'
         when cv.expira_em <= now() then 'expirado'
         else 'pendente' end
  from public.convites cv
  join public.corretoras c on c.id = cv.corretora_id
  join public.cargos cg on cg.id = cv.cargo_id
  left join public.usuarios u on u.id = cv.criado_por
  where cv.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  union all
  select null, null, null, null, 'invalido'
  where not exists (select 1 from public.convites where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex'));
$$;

create or replace function public.aceitar_convite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_cv record; v_email text;
begin
  if (select auth.uid()) is null then raise exception 'Entre na sua conta para aceitar o convite.'; end if;
  select * into v_cv from public.convites where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if v_cv is null then raise exception 'Convite inválido.'; end if;
  if v_cv.aceito_em is not null then raise exception 'Este convite já foi usado.'; end if;
  if v_cv.cancelado_em is not null then raise exception 'Este convite foi cancelado. Peça um novo link.'; end if;
  if v_cv.expira_em <= now() then raise exception 'Este convite expirou. Peça um novo link.'; end if;
  select lower(email) into v_email from auth.users where id = (select auth.uid());
  if v_email is distinct from lower(v_cv.email) then
    raise exception 'Este convite foi feito para outro e-mail (%). Entre com esse e-mail para aceitar.', v_cv.email;
  end if;
  insert into public.usuario_corretora (usuario_id, corretora_id, cargo_id)
  values ((select auth.uid()), v_cv.corretora_id, v_cv.cargo_id)
  on conflict (usuario_id, corretora_id) do update set ativo = true, cargo_id = excluded.cargo_id;
  update public.convites set aceito_em = now(), aceito_por = (select auth.uid()) where id = v_cv.id;
  return v_cv.corretora_id;
end;
$$;

-- ===== Permissões do usuário logado (para a UI) =====
create or replace function public.minhas_permissoes(p_corretora_id uuid)
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'cargo', c.nome,
    'cargo_chave', c.chave,
    'escopo', c.escopo,
    'permissoes', coalesce((select array_agg(cp.permissao order by cp.permissao) from public.cargo_permissoes cp where cp.cargo_id = c.id), '{}'),
    'lider', exists (select 1 from public.equipe_membros em join public.equipes e on e.id = em.equipe_id
                     where e.corretora_id = p_corretora_id and em.usuario_id = (select auth.uid()) and em.lider),
    'dono', exists (select 1 from public.corretoras co join public.contas ct on ct.id = co.conta_id
                    where co.id = p_corretora_id and ct.owner_usuario_id = (select auth.uid()))
  )
  from public.usuario_corretora uc join public.cargos c on c.id = uc.cargo_id
  where uc.corretora_id = p_corretora_id and uc.usuario_id = (select auth.uid()) and uc.ativo;
$$;

-- ===== Produtos do cliente (inclusive de colegas, sem detalhes) =====
create or replace function public.produtos_do_contato_resumo(p_contato_id uuid)
returns table(tipo text, ramo text, situacao text, responsavel_id uuid, responsavel_nome text, meu boolean)
language sql stable security definer set search_path = '' as $$
  select 'apolice', a.ramo,
    case when a.cancelada_em is not null then 'cancelada'
         when exists (select 1 from public.apolices r where r.apolice_anterior_id = a.id) then 'renovada'
         when a.fim_vigencia < (now() at time zone 'America/Sao_Paulo')::date then 'vencida'
         else 'vigente' end,
    a.responsavel_usuario_id, u.nome, public.usuario_ve_responsavel(a.corretora_id, a.responsavel_usuario_id)
  from public.apolices a left join public.usuarios u on u.id = a.responsavel_usuario_id
  where a.contato_id = p_contato_id and public.usuario_ve_contato(p_contato_id)
  union all
  select 'negocio', n.ramo, n.status, n.vendedor_usuario_id, u.nome, public.usuario_ve_responsavel(f.corretora_id, n.vendedor_usuario_id)
  from public.negocios n join public.etapas e on e.id = n.etapa_id join public.fluxos f on f.id = e.fluxo_id
  left join public.usuarios u on u.id = n.vendedor_usuario_id
  where n.contato_id = p_contato_id and n.status = 'aberto' and public.usuario_ve_contato(p_contato_id);
$$;

-- ===== Transferir carteira =====
create or replace function public.transferir_carteira(p_corretora_id uuid, p_de uuid, p_para uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_neg int; v_apo int;
begin
  if not public.usuario_pode(p_corretora_id, 'carteira.transferir') then
    raise exception 'Você não tem permissão para transferir carteira.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.usuario_corretora where corretora_id = p_corretora_id and usuario_id = p_para and ativo) then
    raise exception 'O destino precisa ser um membro ativo da corretora.';
  end if;
  update public.negocios n set vendedor_usuario_id = p_para
  from public.etapas e join public.fluxos f on f.id = e.fluxo_id
  where e.id = n.etapa_id and f.corretora_id = p_corretora_id and n.vendedor_usuario_id = p_de and n.status = 'aberto';
  get diagnostics v_neg = row_count;
  update public.apolices set responsavel_usuario_id = p_para where corretora_id = p_corretora_id and responsavel_usuario_id = p_de;
  get diagnostics v_apo = row_count;
  return v_neg + v_apo;
end;
$$;

-- ===== Guardas de membros =====
create or replace function public.usuario_corretora_guarda()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_era_admin boolean; v_continua_admin boolean; v_dono uuid;
begin
  select ct.owner_usuario_id into v_dono from public.corretoras c join public.contas ct on ct.id = c.conta_id where c.id = old.corretora_id;
  v_continua_admin := new.ativo and exists (select 1 from public.cargos where id = new.cargo_id and chave = 'administrador');
  if old.usuario_id = v_dono and not v_continua_admin then
    raise exception 'O dono da conta é sempre administrador e não pode ser desativado.';
  end if;
  v_era_admin := old.ativo and exists (select 1 from public.cargos where id = old.cargo_id and chave = 'administrador');
  if v_era_admin and not v_continua_admin and not exists (
       select 1 from public.usuario_corretora uc join public.cargos c on c.id = uc.cargo_id
       where uc.corretora_id = old.corretora_id and uc.usuario_id <> old.usuario_id and uc.ativo and c.chave = 'administrador') then
    raise exception 'A corretora precisa de pelo menos um administrador.';
  end if;
  return new;
end;
$$;
create trigger usuario_corretora_guarda before update on public.usuario_corretora
  for each row execute function public.usuario_corretora_guarda();

-- ===== Renovação: negócio vai para o responsável da apólice =====
create or replace function public.criar_negocios_renovacao(
  p_hoje date default (now() at time zone 'America/Sao_Paulo')::date
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_criados integer;
begin
  with candidatas as (
    select a.id as apolice_id, a.contato_id, a.ramo, a.premio, s.nome as seguradora_nome,
      coalesce(a.responsavel_usuario_id, ct.owner_usuario_id) as vendedor_id,
      (select e.id from public.fluxos f join public.etapas e on e.fluxo_id = f.id
       where f.corretora_id = c.id order by f.ativo desc, f.criado_em asc, e.renovacao desc, e.ordem asc limit 1) as etapa_id
    from public.apolices a
    join public.corretoras c on c.id = a.corretora_id
    join public.contas ct on ct.id = c.conta_id
    join public.seguradoras s on s.id = a.seguradora_id
    where a.cancelada_em is null and a.renovacao_gerada_em is null
      and a.fim_vigencia >= p_hoje and a.fim_vigencia - c.dias_antecedencia_renovacao <= p_hoje
      and not exists (select 1 from public.apolices r where r.apolice_anterior_id = a.id)
  ),
  inseridos as (
    insert into public.negocios (etapa_id, contato_id, vendedor_usuario_id, tipo, ramo, seguradora, origem, valor, apolice_renovada_id)
    select etapa_id, contato_id, vendedor_id, 'Renovação simples', ramo, seguradora_nome, 'Renovação', premio, apolice_id
    from candidatas where etapa_id is not null
    on conflict (apolice_renovada_id) where apolice_renovada_id is not null do nothing
    returning apolice_renovada_id
  ),
  marcadas as (
    update public.apolices a set renovacao_gerada_em = now() from inseridos i where a.id = i.apolice_renovada_id returning 1
  )
  select count(*) into v_criados from marcadas;
  return v_criados;
end;
$$;

-- ===== Grants =====
revoke execute on function public.uso_usuarios_conta(uuid), public.criar_convite(uuid, text, uuid), public.regenerar_convite(uuid),
  public.cancelar_convite(uuid), public.info_convite(text), public.aceitar_convite(text), public.minhas_permissoes(uuid),
  public.produtos_do_contato_resumo(uuid), public.transferir_carteira(uuid, uuid, uuid) from public, anon;
grant execute on function public.uso_usuarios_conta(uuid), public.criar_convite(uuid, text, uuid), public.regenerar_convite(uuid),
  public.cancelar_convite(uuid), public.info_convite(text), public.aceitar_convite(text), public.minhas_permissoes(uuid),
  public.produtos_do_contato_resumo(uuid), public.transferir_carteira(uuid, uuid, uuid) to authenticated;
grant execute on function public.info_convite(text) to anon;
revoke execute on function public.usuario_corretora_guarda(), public.criar_negocios_renovacao(date) from public, anon, authenticated;
revoke execute on function public.corretoras_apos_criar() from public, anon, authenticated;
