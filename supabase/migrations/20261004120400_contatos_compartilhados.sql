-- Contatos visíveis para toda a corretora (evita cadastro duplicado). Ficha sensível e edição completa só na carteira.

-- Financeiro sai da tabela de contatos: RLS não esconde colunas por linha
create table public.contato_financeiro (
  contato_id uuid primary key,
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  renda_mensal numeric(14,2),
  patrimonio_financeiro numeric(16,2),
  atualizado_em timestamptz not null default now(),
  constraint contato_financeiro_contato_fkey foreign key (contato_id, corretora_id) references public.contatos(id, corretora_id) on delete cascade
);
create index contato_financeiro_corretora_idx on public.contato_financeiro (corretora_id);
alter table public.contato_financeiro enable row level security;
create policy ve_contato_financeiro on public.contato_financeiro for all to authenticated
  using (public.usuario_ve_contato(contato_id) and public.usuario_pode(corretora_id, 'contatos.financeiro.ver'))
  with check (public.usuario_ve_contato(contato_id) and public.usuario_pode(corretora_id, 'contatos.financeiro.ver'));

insert into public.contato_financeiro (contato_id, corretora_id, renda_mensal, patrimonio_financeiro)
select id, corretora_id, renda_mensal, patrimonio_financeiro from public.contatos
where renda_mensal is not null or patrimonio_financeiro is not null;
alter table public.contatos drop column renda_mensal, drop column patrimonio_financeiro;

-- Leitura: qualquer membro da corretora. Edição: carteira edita tudo; demais membros só telefone e e-mail (trigger)
drop policy ve_contato_select on public.contatos;
create policy membro_ve_contato on public.contatos for select to authenticated
  using (public.usuario_possui_corretora(corretora_id));
drop policy ve_contato_update on public.contatos;
create policy membro_altera_contato on public.contatos for update to authenticated
  using (public.usuario_possui_corretora(corretora_id)) with check (public.usuario_possui_corretora(corretora_id));

create or replace function public.contatos_edicao_fora_da_carteira()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or public.usuario_ve_contato(old.id) then return new; end if;
  if (to_jsonb(new) - array['telefone','email']) is distinct from (to_jsonb(old) - array['telefone','email']) then
    raise exception 'Este cliente é da carteira de outro produtor: você só pode corrigir telefone e e-mail.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger contatos_edicao_fora_da_carteira before update on public.contatos
  for each row execute function public.contatos_edicao_fora_da_carteira();
revoke execute on function public.contatos_edicao_fora_da_carteira() from public, anon, authenticated;

-- Resumo "também tem com colegas" para qualquer membro que abre o contato
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
  where a.contato_id = p_contato_id and public.usuario_possui_corretora(a.corretora_id)
  union all
  select 'negocio', n.ramo, n.status, n.vendedor_usuario_id, u.nome, public.usuario_ve_responsavel(f.corretora_id, n.vendedor_usuario_id)
  from public.negocios n join public.etapas e on e.id = n.etapa_id join public.fluxos f on f.id = e.fluxo_id
  left join public.usuarios u on u.id = n.vendedor_usuario_id
  where n.contato_id = p_contato_id and n.status = 'aberto' and public.usuario_possui_corretora(f.corretora_id);
$$;
