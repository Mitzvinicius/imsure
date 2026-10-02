-- ===== Alterações em tabelas existentes =====
alter table public.corretoras
  add column dias_antecedencia_renovacao integer not null default 60
  constraint corretoras_dias_antecedencia_check check (dias_antecedencia_renovacao > 0 and dias_antecedencia_renovacao <= 365);

alter table public.etapas add column renovacao boolean not null default false;
create unique index etapas_uma_renovacao_por_fluxo on public.etapas (fluxo_id) where renovacao;

update public.etapas set renovacao = true
where id in (
  select distinct on (fluxo_id) id
  from public.etapas
  where translate(lower(nome), 'çãáàâéêíóôõú', 'caaaaeeiooou') like '%renova%'
  order by fluxo_id, ordem
);

-- ===== Helper de posse =====
create or replace function public.usuario_possui_corretora(p_corretora_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.corretoras c
    join public.contas ct on ct.id = c.conta_id
    where c.id = p_corretora_id and ct.owner_usuario_id = (select auth.uid())
  );
$$;

-- ===== Seguradoras (lista global) =====
create table public.seguradoras (
  id uuid primary key default gen_random_uuid(),
  nome text not null constraint seguradoras_nome_key unique,
  codigo_susep text constraint seguradoras_codigo_susep_key unique,
  telefone_assistencia text,
  telefone_sinistro text,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.seguradoras enable row level security;
create policy autenticado_pode_ler_seguradoras on public.seguradoras
  for select to authenticated using (true);

-- Telefones e códigos SUSEP ficam nulos até serem confirmados com fonte oficial.
insert into public.seguradoras (nome) values
  ('Allianz'), ('Azul Seguros'), ('Bradesco Seguros'), ('HDI Seguros'), ('Itaú Seguros'),
  ('Mapfre'), ('Mitsui Sumitomo'), ('Porto Seguro'), ('Sompo Seguros'), ('SulAmérica'),
  ('Suhai Seguradora'), ('Tokio Marine'), ('Yelum Seguros'), ('Zurich');

-- ===== Apólices =====
create table public.apolices (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  contato_id uuid not null references public.contatos(id) on delete restrict,
  seguradora_id uuid not null references public.seguradoras(id),
  ramo text not null,
  numero text not null,
  inicio_vigencia date not null,
  fim_vigencia date not null,
  premio numeric(12,2),
  percentual_comissao numeric(5,2),
  forma_pagamento text not null constraint apolices_forma_pagamento_check check (forma_pagamento in ('boleto','cartao','debito')),
  cancelada_em date,
  descricao_bem text,
  negocio_origem_id uuid constraint apolices_negocio_origem_id_fkey references public.negocios(id) on delete set null,
  apolice_anterior_id uuid constraint apolices_apolice_anterior_id_fkey references public.apolices(id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint apolices_vigencia_check check (fim_vigencia > inicio_vigencia),
  constraint apolices_seguradora_numero_key unique (seguradora_id, numero),
  constraint apolices_negocio_origem_key unique (negocio_origem_id),
  constraint apolices_apolice_anterior_key unique (apolice_anterior_id)
);
create index apolices_corretora_id_idx on public.apolices (corretora_id);
create index apolices_contato_id_idx on public.apolices (contato_id);
create index apolices_fim_vigencia_idx on public.apolices (fim_vigencia);
alter table public.apolices enable row level security;
create policy owner_pode_gerenciar_apolices on public.apolices for all
  using (public.usuario_possui_corretora(corretora_id))
  with check (public.usuario_possui_corretora(corretora_id));

create or replace function public.usuario_possui_apolice(p_apolice_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.apolices a
    join public.corretoras c on c.id = a.corretora_id
    join public.contas ct on ct.id = c.conta_id
    where a.id = p_apolice_id and ct.owner_usuario_id = (select auth.uid())
  );
$$;

alter table public.negocios
  add column apolice_renovada_id uuid constraint negocios_apolice_renovada_id_fkey references public.apolices(id) on delete set null;
create unique index negocios_apolice_renovada_key on public.negocios (apolice_renovada_id) where apolice_renovada_id is not null;

-- ===== Endossos =====
create table public.endossos (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  numero text not null,
  tipo text not null constraint endossos_tipo_check check (tipo in ('alteracao_bem','inclusao','exclusao','alteracao_cobertura','cancelamento','outro')),
  data_emissao date,
  descricao text,
  valor numeric(12,2),
  criado_em timestamptz not null default now(),
  constraint endossos_apolice_numero_key unique (apolice_id, numero),
  constraint endossos_id_apolice_key unique (id, apolice_id)
);
alter table public.endossos enable row level security;
create policy owner_pode_gerenciar_endossos on public.endossos for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

-- ===== Parcelas =====
create table public.parcelas (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  endosso_id uuid,
  numero integer not null constraint parcelas_numero_check check (numero > 0),
  vencimento date not null,
  valor numeric(12,2) not null,
  comissao_esperada numeric(12,2),
  status text not null default 'aberta' constraint parcelas_status_check check (status in ('aberta','paga','comissao_recebida')),
  baixa_origem text constraint parcelas_baixa_origem_check check (baixa_origem in ('manual','extrato')),
  baixa_em timestamptz,
  baixa_referencia text,
  linha_digitavel text,
  pix_copia_cola text,
  criado_em timestamptz not null default now(),
  -- endosso precisa ser da mesma apólice
  constraint parcelas_endosso_fkey foreign key (endosso_id, apolice_id) references public.endossos(id, apolice_id) on delete cascade
);
create unique index parcelas_apolice_numero_key on public.parcelas (apolice_id, numero) where endosso_id is null;
create unique index parcelas_endosso_numero_key on public.parcelas (endosso_id, numero) where endosso_id is not null;
create index parcelas_vencimento_idx on public.parcelas (vencimento);
alter table public.parcelas enable row level security;
create policy owner_pode_gerenciar_parcelas on public.parcelas for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

-- ===== Coberturas =====
create table public.coberturas (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  endosso_id uuid,
  nome text not null,
  importancia_segurada numeric(14,2),
  franquia numeric(12,2),
  criado_em timestamptz not null default now(),
  constraint coberturas_endosso_fkey foreign key (endosso_id, apolice_id) references public.endossos(id, apolice_id) on delete cascade
);
create index coberturas_apolice_id_idx on public.coberturas (apolice_id);
alter table public.coberturas enable row level security;
create policy owner_pode_gerenciar_coberturas on public.coberturas for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

-- ===== Bens segurados =====
create table public.bens_auto (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  placa text, chassi text, marca text, modelo text,
  ano_fabricacao integer, ano_modelo integer, cep_pernoite text,
  criado_em timestamptz not null default now()
);
create index bens_auto_apolice_id_idx on public.bens_auto (apolice_id);
create index bens_auto_placa_idx on public.bens_auto (upper(placa));
create index bens_auto_chassi_idx on public.bens_auto (upper(chassi));
alter table public.bens_auto enable row level security;
create policy owner_pode_gerenciar_bens_auto on public.bens_auto for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

create table public.bens_residencial (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  cep text, logradouro text, numero text, complemento text, bairro text, cidade text, uf text,
  tipo_imovel text constraint bens_residencial_tipo_check check (tipo_imovel in ('casa','apartamento','condominio','outro')),
  criado_em timestamptz not null default now()
);
create index bens_residencial_apolice_id_idx on public.bens_residencial (apolice_id);
alter table public.bens_residencial enable row level security;
create policy owner_pode_gerenciar_bens_residencial on public.bens_residencial for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

create table public.bens_rc (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  atividade text not null,
  limite numeric(14,2),
  criado_em timestamptz not null default now()
);
create index bens_rc_apolice_id_idx on public.bens_rc (apolice_id);
alter table public.bens_rc enable row level security;
create policy owner_pode_gerenciar_bens_rc on public.bens_rc for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

create table public.vidas_seguradas (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  nome text not null,
  cpf text,
  data_nascimento date,
  criado_em timestamptz not null default now()
);
create index vidas_seguradas_apolice_id_idx on public.vidas_seguradas (apolice_id);
alter table public.vidas_seguradas enable row level security;
create policy owner_pode_gerenciar_vidas_seguradas on public.vidas_seguradas for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

create table public.beneficiarios (
  id uuid primary key default gen_random_uuid(),
  vida_segurada_id uuid not null references public.vidas_seguradas(id) on delete cascade,
  nome text not null,
  parentesco text,
  percentual numeric(5,2) not null constraint beneficiarios_percentual_check check (percentual > 0 and percentual <= 100),
  criado_em timestamptz not null default now()
);
create index beneficiarios_vida_segurada_id_idx on public.beneficiarios (vida_segurada_id);
alter table public.beneficiarios enable row level security;
create policy owner_pode_gerenciar_beneficiarios on public.beneficiarios for all
  using (exists (select 1 from public.vidas_seguradas v where v.id = vida_segurada_id and public.usuario_possui_apolice(v.apolice_id)))
  with check (exists (select 1 from public.vidas_seguradas v where v.id = vida_segurada_id and public.usuario_possui_apolice(v.apolice_id)));

-- Helpers só para usuários logados (aplicado como migração seguros_base_revoke_anon)
revoke execute on function public.usuario_possui_corretora(uuid) from public, anon;
revoke execute on function public.usuario_possui_apolice(uuid) from public, anon;
grant execute on function public.usuario_possui_corretora(uuid) to authenticated;
grant execute on function public.usuario_possui_apolice(uuid) to authenticated;
