-- Ficha do contato: estado civil e informações financeiras
alter table public.contatos
  add column estado_civil text constraint contatos_estado_civil_check
    check (estado_civil in ('solteiro','casado','uniao_estavel','divorciado','separado','viuvo')),
  add column renda_mensal numeric(14,2),
  add column patrimonio_imobilizado numeric(16,2),
  add column patrimonio_financeiro numeric(16,2);

-- Permite FK composta garantindo que os dois lados do vínculo são da mesma corretora
alter table public.contatos add constraint contatos_id_corretora_key unique (id, corretora_id);

-- Vínculo familiar gravado uma vez: "parente é <parentesco> de contato". O lado inverso é derivado no código.
create table public.contato_vinculos (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  contato_id uuid not null,
  parente_id uuid not null,
  parentesco text not null constraint contato_vinculos_parentesco_check check (parentesco in
    ('conjuge','pai_mae','filho','irmao','avo','neto','sogro','genro_nora','cunhado','enteado','padrasto_madrasta')),
  criado_em timestamptz not null default now(),
  constraint contato_vinculos_diferentes_check check (contato_id <> parente_id),
  constraint contato_vinculos_contato_fkey foreign key (contato_id, corretora_id) references public.contatos(id, corretora_id) on delete cascade,
  constraint contato_vinculos_parente_fkey foreign key (parente_id, corretora_id) references public.contatos(id, corretora_id) on delete cascade
);
-- Um par de contatos só pode ter um vínculo, em qualquer sentido
create unique index contato_vinculos_par_key on public.contato_vinculos (least(contato_id, parente_id), greatest(contato_id, parente_id));
create index contato_vinculos_contato_idx on public.contato_vinculos (contato_id, corretora_id);
create index contato_vinculos_parente_idx on public.contato_vinculos (parente_id, corretora_id);
create index contato_vinculos_corretora_idx on public.contato_vinculos (corretora_id);

alter table public.contato_vinculos enable row level security;
create policy owner_pode_gerenciar_contato_vinculos on public.contato_vinculos for all to authenticated
  using (public.usuario_possui_corretora(corretora_id))
  with check (public.usuario_possui_corretora(corretora_id));
