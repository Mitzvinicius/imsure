create table public.sinistros (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  bem_auto_id uuid references public.bens_auto(id) on delete set null,
  bem_residencial_id uuid references public.bens_residencial(id) on delete set null,
  data_ocorrencia date not null,
  tipo text not null,
  descricao text,
  numero_seguradora text,
  status text not null default 'aberto' constraint sinistros_status_check check (status in
    ('aberto','em_analise','vistoria','em_oficina','documentacao_pendente','aprovado','negado','indenizado','encerrado')),
  valor_indenizacao numeric(12,2),
  criado_em timestamptz not null default now()
);
create index sinistros_apolice_id_idx on public.sinistros (apolice_id);
alter table public.sinistros enable row level security;
create policy owner_pode_gerenciar_sinistros on public.sinistros for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

create table public.sinistro_andamentos (
  id uuid primary key default gen_random_uuid(),
  sinistro_id uuid not null references public.sinistros(id) on delete cascade,
  data timestamptz not null default now(),
  descricao text not null,
  status_novo text,
  numero_processo text,
  usuario_id uuid references auth.users(id),
  usuario_nome text not null,
  criado_em timestamptz not null default now()
);
create index sinistro_andamentos_sinistro_id_idx on public.sinistro_andamentos (sinistro_id);
alter table public.sinistro_andamentos enable row level security;
create policy owner_pode_gerenciar_sinistro_andamentos on public.sinistro_andamentos for all
  using (exists (select 1 from public.sinistros s where s.id = sinistro_id and public.usuario_possui_apolice(s.apolice_id)))
  with check (exists (select 1 from public.sinistros s where s.id = sinistro_id and public.usuario_possui_apolice(s.apolice_id)));

create table public.apolice_anexos (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  endosso_id uuid references public.endossos(id) on delete cascade,
  parcela_id uuid references public.parcelas(id) on delete cascade,
  sinistro_id uuid references public.sinistros(id) on delete cascade,
  sinistro_andamento_id uuid references public.sinistro_andamentos(id) on delete cascade,
  nome_arquivo text not null,
  caminho_storage text not null,
  tamanho_bytes bigint,
  tipo_mime text,
  usuario_id uuid references auth.users(id),
  usuario_nome text not null,
  criado_em timestamptz not null default now()
);
create index apolice_anexos_apolice_id_idx on public.apolice_anexos (apolice_id);
create index apolice_anexos_sinistro_id_idx on public.apolice_anexos (sinistro_id);
alter table public.apolice_anexos enable row level security;
create policy owner_pode_gerenciar_apolice_anexos on public.apolice_anexos for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

insert into storage.buckets (id, name, public) values ('apolice-anexos', 'apolice-anexos', false)
on conflict (id) do nothing;

create policy owner_pode_gerenciar_storage_apolice_anexos on storage.objects for all
  using (
    bucket_id = 'apolice-anexos'
    and exists (select 1 from public.apolices a where a.id::text = (storage.foldername(name))[1] and public.usuario_possui_corretora(a.corretora_id))
  )
  with check (
    bucket_id = 'apolice-anexos'
    and exists (select 1 from public.apolices a where a.id::text = (storage.foldername(name))[1] and public.usuario_possui_corretora(a.corretora_id))
  );
