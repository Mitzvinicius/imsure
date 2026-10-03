-- ===== Planos e conta =====
alter table public.planos add column limite_usuarios integer, add column preco_usuario_extra numeric(10,2);
update public.planos set limite_usuarios = case nome when 'Starter' then 2 when 'Pro' then 5 when 'Business' then 15 end, preco_usuario_extra = 24.90;
alter table public.contas add column usuarios_extras integer not null default 0;

-- ===== Catálogo de permissões =====
create table public.permissoes (
  chave text primary key,
  grupo text not null,
  descricao text not null
);
alter table public.permissoes enable row level security;
create policy autenticado_le_permissoes on public.permissoes for select to authenticated using (true);
insert into public.permissoes (chave, grupo, descricao) values
  ('negocios.excluir','Negócios','Excluir negócios'),
  ('apolices.excluir','Apólices','Excluir apólices'),
  ('sinistros.excluir','Sinistros','Excluir sinistros'),
  ('carteira.transferir','Carteira','Trocar responsável e transferir carteira'),
  ('parcelas.baixa','Financeiro','Dar baixa em parcelas'),
  ('contatos.financeiro.ver','Contatos','Ver dados financeiros e patrimônio do cliente'),
  ('contatos.saude.ver','Contatos','Ver dados de saúde do cliente'),
  ('equipe.membros','Equipe','Convidar, trocar cargo e desativar membros'),
  ('equipe.equipes','Equipe','Gerenciar equipes e líderes'),
  ('configuracoes.editar','Corretora','Editar configurações e funis da corretora'),
  ('plano.gerenciar','Conta','Gerenciar plano e cobrança da conta');

-- ===== Cargos =====
create table public.cargos (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  nome text not null,
  chave text constraint cargos_chave_check check (chave in ('administrador','gerente','financeiro','operacional','produtor')),
  escopo text not null constraint cargos_escopo_check check (escopo in ('tudo','equipe','propria')),
  padrao boolean not null default false,
  criado_em timestamptz not null default now(),
  constraint cargos_corretora_nome_key unique (corretora_id, nome),
  constraint cargos_id_corretora_key unique (id, corretora_id)
);
create unique index cargos_corretora_chave_key on public.cargos (corretora_id, chave) where chave is not null;

create table public.cargo_permissoes (
  cargo_id uuid not null references public.cargos(id) on delete cascade,
  permissao text not null references public.permissoes(chave),
  primary key (cargo_id, permissao)
);

-- ===== Membros =====
create table public.usuario_corretora (
  usuario_id uuid not null references public.usuarios(id),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  cargo_id uuid not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  primary key (usuario_id, corretora_id),
  constraint usuario_corretora_cargo_fkey foreign key (cargo_id, corretora_id) references public.cargos(id, corretora_id)
);
create index usuario_corretora_corretora_idx on public.usuario_corretora (corretora_id);

-- ===== Equipes =====
create table public.equipes (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  nome text not null,
  ramos text[] not null default '{}',
  criado_em timestamptz not null default now(),
  constraint equipes_corretora_nome_key unique (corretora_id, nome)
);
create table public.equipe_membros (
  equipe_id uuid not null references public.equipes(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id),
  lider boolean not null default false,
  primary key (equipe_id, usuario_id)
);
create index equipe_membros_usuario_idx on public.equipe_membros (usuario_id);

-- ===== Convites =====
create table public.convites (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  email text not null,
  cargo_id uuid not null,
  token_hash text not null unique,
  expira_em timestamptz not null default now() + interval '7 days',
  aceito_em timestamptz,
  aceito_por uuid references public.usuarios(id),
  cancelado_em timestamptz,
  criado_por uuid references public.usuarios(id),
  criado_em timestamptz not null default now(),
  constraint convites_cargo_fkey foreign key (cargo_id, corretora_id) references public.cargos(id, corretora_id)
);
create unique index convites_pendente_email_key on public.convites (corretora_id, lower(email)) where aceito_em is null and cancelado_em is null;

-- ===== Responsável e criador =====
alter table public.apolices add column responsavel_usuario_id uuid references public.usuarios(id) default auth.uid();
alter table public.contatos add column criado_por_usuario_id uuid references public.usuarios(id) default auth.uid();
create index apolices_responsavel_idx on public.apolices (corretora_id, responsavel_usuario_id);
create index negocios_vendedor_idx on public.negocios (vendedor_usuario_id);

update public.apolices a set responsavel_usuario_id = coalesce(
  (select n.vendedor_usuario_id from public.negocios n where n.id = a.negocio_origem_id),
  (select ct.owner_usuario_id from public.corretoras c join public.contas ct on ct.id = c.conta_id where c.id = a.corretora_id));
update public.contatos co set criado_por_usuario_id =
  (select ct.owner_usuario_id from public.corretoras c join public.contas ct on ct.id = c.conta_id where c.id = co.corretora_id);
alter table public.apolices alter column responsavel_usuario_id set not null;

-- ===== Cargos padrão =====
create or replace function public.criar_cargos_padrao(p_corretora_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.cargos (corretora_id, nome, chave, escopo, padrao) values (p_corretora_id, 'Administrador', 'administrador', 'tudo', true) returning id into v_id;
  insert into public.cargo_permissoes (cargo_id, permissao) select v_id, chave from public.permissoes;

  insert into public.cargos (corretora_id, nome, chave, escopo, padrao) values (p_corretora_id, 'Gerente', 'gerente', 'tudo', true) returning id into v_id;
  insert into public.cargo_permissoes (cargo_id, permissao) select v_id, unnest(array['negocios.excluir','apolices.excluir','sinistros.excluir','carteira.transferir','parcelas.baixa','contatos.financeiro.ver','equipe.equipes']);

  insert into public.cargos (corretora_id, nome, chave, escopo, padrao) values (p_corretora_id, 'Financeiro', 'financeiro', 'tudo', true) returning id into v_id;
  insert into public.cargo_permissoes (cargo_id, permissao) select v_id, unnest(array['parcelas.baixa','contatos.financeiro.ver','configuracoes.editar','plano.gerenciar']);

  insert into public.cargos (corretora_id, nome, chave, escopo, padrao) values (p_corretora_id, 'Operacional', 'operacional', 'tudo', true) returning id into v_id;
  insert into public.cargo_permissoes (cargo_id, permissao) select v_id, unnest(array['parcelas.baixa','contatos.financeiro.ver','contatos.saude.ver']);

  insert into public.cargos (corretora_id, nome, chave, escopo, padrao) values (p_corretora_id, 'Produtor', 'produtor', 'propria', true) returning id into v_id;
  insert into public.cargo_permissoes (cargo_id, permissao) select v_id, unnest(array['contatos.financeiro.ver','contatos.saude.ver']);
end;
$$;
revoke execute on function public.criar_cargos_padrao(uuid) from public, anon, authenticated;

-- Toda corretora nova: cargos padrão + dono da conta como Administrador
create or replace function public.corretoras_apos_criar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.criar_cargos_padrao(new.id);
  insert into public.usuario_corretora (usuario_id, corretora_id, cargo_id)
  select ct.owner_usuario_id, new.id, c.id
  from public.contas ct, public.cargos c
  where ct.id = new.conta_id and c.corretora_id = new.id and c.chave = 'administrador';
  return new;
end;
$$;
create trigger corretoras_apos_criar after insert on public.corretoras for each row execute function public.corretoras_apos_criar();

-- Backfill das corretoras existentes
do $$
declare r record;
begin
  for r in select c.id, ct.owner_usuario_id from public.corretoras c join public.contas ct on ct.id = c.conta_id loop
    perform public.criar_cargos_padrao(r.id);
    insert into public.usuario_corretora (usuario_id, corretora_id, cargo_id)
    select r.owner_usuario_id, r.id, id from public.cargos where corretora_id = r.id and chave = 'administrador';
  end loop;
end $$;

-- ===== Funções de acesso =====
create or replace function public.usuario_possui_corretora(p_corretora_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuario_corretora uc
    where uc.corretora_id = p_corretora_id and uc.usuario_id = (select auth.uid()) and uc.ativo
  );
$$;

create or replace function public.usuario_pode(p_corretora_id uuid, p_permissao text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuario_corretora uc
    join public.cargo_permissoes cp on cp.cargo_id = uc.cargo_id
    where uc.corretora_id = p_corretora_id and uc.usuario_id = (select auth.uid()) and uc.ativo and cp.permissao = p_permissao
  );
$$;

create or replace function public.escopo_usuario(p_corretora_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select c.escopo from public.usuario_corretora uc join public.cargos c on c.id = uc.cargo_id
  where uc.corretora_id = p_corretora_id and uc.usuario_id = (select auth.uid()) and uc.ativo;
$$;

-- Enxerga registros deste responsável? tudo; o próprio; líder das equipes do responsável; escopo 'equipe' = mesma equipe
create or replace function public.usuario_ve_responsavel(p_corretora_id uuid, p_responsavel uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case coalesce(public.escopo_usuario(p_corretora_id), 'nenhum')
    when 'tudo' then true
    when 'nenhum' then false
    else p_responsavel = (select auth.uid())
      or exists (
        select 1 from public.equipe_membros eu
        join public.equipe_membros er on er.equipe_id = eu.equipe_id
        join public.equipes e on e.id = eu.equipe_id
        where e.corretora_id = p_corretora_id
          and eu.usuario_id = (select auth.uid())
          and er.usuario_id = p_responsavel
          and (eu.lider or public.escopo_usuario(p_corretora_id) = 'equipe')
      )
  end;
$$;

revoke execute on function public.usuario_possui_corretora(uuid), public.usuario_pode(uuid, text), public.escopo_usuario(uuid), public.usuario_ve_responsavel(uuid, uuid) from public, anon;
grant execute on function public.usuario_possui_corretora(uuid), public.usuario_pode(uuid, text), public.escopo_usuario(uuid), public.usuario_ve_responsavel(uuid, uuid) to authenticated;

-- ===== RLS das tabelas novas =====
alter table public.cargos enable row level security;
create policy membro_le_cargos on public.cargos for select to authenticated using (public.usuario_possui_corretora(corretora_id));
alter table public.cargo_permissoes enable row level security;
create policy membro_le_cargo_permissoes on public.cargo_permissoes for select to authenticated
  using (exists (select 1 from public.cargos c where c.id = cargo_id and public.usuario_possui_corretora(c.corretora_id)));

alter table public.usuario_corretora enable row level security;
create policy membro_le_membros on public.usuario_corretora for select to authenticated
  using (usuario_id = (select auth.uid()) or public.usuario_possui_corretora(corretora_id));
create policy gestor_altera_membros on public.usuario_corretora for update to authenticated
  using (public.usuario_pode(corretora_id, 'equipe.membros'))
  with check (public.usuario_pode(corretora_id, 'equipe.membros'));

alter table public.equipes enable row level security;
create policy membro_le_equipes on public.equipes for select to authenticated using (public.usuario_possui_corretora(corretora_id));
create policy gestor_gerencia_equipes on public.equipes for all to authenticated
  using (public.usuario_pode(corretora_id, 'equipe.equipes'))
  with check (public.usuario_pode(corretora_id, 'equipe.equipes'));

alter table public.equipe_membros enable row level security;
create policy membro_le_equipe_membros on public.equipe_membros for select to authenticated
  using (exists (select 1 from public.equipes e where e.id = equipe_id and public.usuario_possui_corretora(e.corretora_id)));
create policy gestor_gerencia_equipe_membros on public.equipe_membros for all to authenticated
  using (exists (select 1 from public.equipes e where e.id = equipe_id and public.usuario_pode(e.corretora_id, 'equipe.equipes')))
  with check (exists (select 1 from public.equipes e where e.id = equipe_id and public.usuario_pode(e.corretora_id, 'equipe.equipes'))
    and exists (select 1 from public.equipes e join public.usuario_corretora uc on uc.corretora_id = e.corretora_id
                where e.id = equipe_id and uc.usuario_id = equipe_membros.usuario_id));

alter table public.convites enable row level security;
create policy gestor_le_convites on public.convites for select to authenticated using (public.usuario_pode(corretora_id, 'equipe.membros'));
