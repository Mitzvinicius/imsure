-- Patrimônio imobilizado vira lista de bens (o campo único nunca recebeu dados)
alter table public.contatos drop column patrimonio_imobilizado;

create table public.contato_bens (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  contato_id uuid not null,
  tipo text not null constraint contato_bens_tipo_check check (tipo in ('imovel','veiculo','outro')),
  descricao text not null,
  valor_estimado numeric(16,2),
  placa text,
  endereco text,
  criado_em timestamptz not null default now(),
  constraint contato_bens_contato_fkey foreign key (contato_id, corretora_id) references public.contatos(id, corretora_id) on delete cascade,
  constraint contato_bens_id_contato_key unique (id, contato_id)
);
create index contato_bens_contato_idx on public.contato_bens (contato_id, corretora_id);
create index contato_bens_corretora_idx on public.contato_bens (corretora_id);
alter table public.contato_bens enable row level security;
create policy owner_pode_gerenciar_contato_bens on public.contato_bens for all to authenticated
  using (public.usuario_possui_corretora(corretora_id))
  with check (public.usuario_possui_corretora(corretora_id));

-- Vínculo manual bem ↔ apólice. contato_id nas duas FKs garante que a apólice é do mesmo cliente.
alter table public.apolices add constraint apolices_id_contato_key unique (id, contato_id);
create table public.contato_bem_apolices (
  bem_id uuid not null,
  apolice_id uuid not null,
  contato_id uuid not null,
  criado_em timestamptz not null default now(),
  primary key (bem_id, apolice_id),
  constraint contato_bem_apolices_bem_fkey foreign key (bem_id, contato_id) references public.contato_bens(id, contato_id) on delete cascade,
  constraint contato_bem_apolices_apolice_fkey foreign key (apolice_id, contato_id) references public.apolices(id, contato_id) on delete cascade
);
create index contato_bem_apolices_apolice_idx on public.contato_bem_apolices (apolice_id, contato_id);
create index contato_bem_apolices_bem_idx on public.contato_bem_apolices (bem_id, contato_id);
alter table public.contato_bem_apolices enable row level security;
create policy owner_pode_gerenciar_contato_bem_apolices on public.contato_bem_apolices for all to authenticated
  using (exists (select 1 from public.contato_bens b where b.id = bem_id and public.usuario_possui_corretora(b.corretora_id)))
  with check (exists (select 1 from public.contato_bens b where b.id = bem_id and public.usuario_possui_corretora(b.corretora_id)));

-- Saúde em tabela própria: dado sensível (LGPD), facilita restringir acesso quando houver equipe
create table public.contato_saude (
  contato_id uuid primary key,
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  peso_kg numeric(5,1) constraint contato_saude_peso_check check (peso_kg > 0 and peso_kg < 700),
  altura_m numeric(3,2) constraint contato_saude_altura_check check (altura_m > 0 and altura_m < 3),
  atualizado_em timestamptz not null default now(),
  constraint contato_saude_contato_fkey foreign key (contato_id, corretora_id) references public.contatos(id, corretora_id) on delete cascade
);
create index contato_saude_corretora_idx on public.contato_saude (corretora_id);
alter table public.contato_saude enable row level security;
create policy owner_pode_gerenciar_contato_saude on public.contato_saude for all to authenticated
  using (public.usuario_possui_corretora(corretora_id))
  with check (public.usuario_possui_corretora(corretora_id));
