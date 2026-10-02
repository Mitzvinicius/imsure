-- Marca a apólice quando o negócio de renovação é gerado, para que um negócio apagado
-- pelo corretor não seja recriado todo dia (achado da revisão final).
alter table public.apolices add column renovacao_gerada_em timestamptz;

update public.apolices a set renovacao_gerada_em = now()
where exists (select 1 from public.negocios n where n.apolice_renovada_id = a.id);

create or replace function public.criar_negocios_renovacao(
  p_hoje date default (now() at time zone 'America/Sao_Paulo')::date
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_criados integer;
begin
  with candidatas as (
    select
      a.id as apolice_id,
      a.contato_id,
      a.ramo,
      a.premio,
      s.nome as seguradora_nome,
      coalesce(
        (select n.vendedor_usuario_id from public.negocios n where n.id = a.negocio_origem_id),
        ct.owner_usuario_id
      ) as vendedor_id,
      (
        select e.id
        from public.fluxos f
        join public.etapas e on e.fluxo_id = f.id
        where f.corretora_id = c.id
        order by f.ativo desc, f.criado_em asc, e.renovacao desc, e.ordem asc
        limit 1
      ) as etapa_id
    from public.apolices a
    join public.corretoras c on c.id = a.corretora_id
    join public.contas ct on ct.id = c.conta_id
    join public.seguradoras s on s.id = a.seguradora_id
    where a.cancelada_em is null
      and a.renovacao_gerada_em is null
      and a.fim_vigencia >= p_hoje
      and a.fim_vigencia - c.dias_antecedencia_renovacao <= p_hoje
      and not exists (select 1 from public.apolices r where r.apolice_anterior_id = a.id)
  ),
  inseridos as (
    insert into public.negocios (etapa_id, contato_id, vendedor_usuario_id, tipo, ramo, seguradora, origem, valor, apolice_renovada_id)
    select etapa_id, contato_id, vendedor_id, 'Renovação simples', ramo, seguradora_nome, 'Renovação', premio, apolice_id
    from candidatas
    where etapa_id is not null
    on conflict (apolice_renovada_id) where apolice_renovada_id is not null do nothing
    returning apolice_renovada_id
  ),
  marcadas as (
    update public.apolices a set renovacao_gerada_em = now()
    from inseridos i where a.id = i.apolice_renovada_id
    returning 1
  )
  select count(*) into v_criados from marcadas;
  return v_criados;
end;
$$;

revoke execute on function public.criar_negocios_renovacao(date) from public, anon, authenticated;
