-- Status do negócio (ganho ao emitir apólice; perdido é manual, com motivo)
alter table public.negocios
  add column status text not null default 'aberto'
    constraint negocios_status_check check (status in ('aberto','ganho','perdido')),
  add column motivo_perda text,
  add column observacao_perda text;

update public.negocios n set status = 'ganho'
where exists (select 1 from public.apolices a where a.negocio_origem_id = n.id);

-- Etapa para onde o negócio vai quando a apólice é emitida (escolhida nas Configurações)
alter table public.etapas add column emissao boolean not null default false;
create unique index etapas_uma_emissao_por_fluxo on public.etapas (fluxo_id) where emissao;

update public.etapas set emissao = true
where id in (
  select distinct on (fluxo_id) id
  from public.etapas
  where translate(lower(nome), 'çãáàâéêíóôõú', 'caaaaeeiooou') ~ '(emitid|emissao)'
  order by fluxo_id, ordem
);
