begin;

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000001aa', 'renov@teste.local', 'authenticated', 'authenticated', '{"nome":"Renov"}');
insert into public.contas (id, nome, plano_id, owner_usuario_id)
select '00000000-0000-0000-0000-0000000001c0', 'Conta R', (select id from public.planos limit 1), '00000000-0000-0000-0000-0000000001aa';
insert into public.corretoras (id, conta_id, nome, onboarding_concluido, dias_antecedencia_renovacao) values
  ('00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-0000000001c0', 'Corretora R', true, 60),
  ('00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-0000000001c0', 'Corretora sem fluxo', true, 60);
insert into public.fluxos (id, corretora_id, nome, ativo) values ('00000000-0000-0000-0000-0000000001f0', '00000000-0000-0000-0000-0000000001c1', 'Funil', true);
insert into public.etapas (id, fluxo_id, nome, ordem, renovacao) values
  ('00000000-0000-0000-0000-0000000001e0', '00000000-0000-0000-0000-0000000001f0', 'Novo', 0, false),
  ('00000000-0000-0000-0000-0000000001e1', '00000000-0000-0000-0000-0000000001f0', 'Renovações', 1, true);
insert into public.contatos (id, corretora_id, nome, tipo_pessoa) values
  ('00000000-0000-0000-0000-0000000001d0', '00000000-0000-0000-0000-0000000001c1', 'Cliente R', 'fisica'),
  ('00000000-0000-0000-0000-0000000002d0', '00000000-0000-0000-0000-0000000002c1', 'Cliente S', 'fisica');

-- hoje fixo = 2026-10-02 ; janela de 60 dias => fim_vigencia até 2026-12-01 entra
insert into public.apolices (id, corretora_id, contato_id, seguradora_id, ramo, numero, inicio_vigencia, fim_vigencia, forma_pagamento, premio, cancelada_em) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-0000000001d0', (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'R-DENTRO', '2025-11-15', '2026-11-15', 'boleto', 2000, null),
  ('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-0000000001d0', (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'R-FORA', '2026-03-01', '2027-03-01', 'boleto', 2000, null),
  ('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-0000000001d0', (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'R-CANCEL', '2025-11-15', '2026-11-15', 'boleto', 2000, '2026-06-01'),
  ('00000000-0000-0000-0000-0000000001a4', '00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-0000000001d0', (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'R-VENCIDA', '2025-01-01', '2026-01-01', 'boleto', 2000, null),
  ('00000000-0000-0000-0000-0000000002a1', '00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-0000000002d0', (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'S-SEMFLUXO', '2025-11-15', '2026-11-15', 'boleto', 2000, null);

do $$
declare n1 integer; n2 integer;
begin
  n1 := public.criar_negocios_renovacao('2026-10-02');
  n2 := public.criar_negocios_renovacao('2026-10-02');
  if n1 <> 1 then raise exception 'FALHA: esperava 1 negócio na 1ª execução, veio %', n1; end if;
  if n2 <> 0 then raise exception 'FALHA: 2ª execução duplicou (% negócios)', n2; end if;
  if (select count(*) from public.negocios where apolice_renovada_id = '00000000-0000-0000-0000-0000000001a1') <> 1 then
    raise exception 'FALHA: negócio de renovação não criado para R-DENTRO'; end if;
  if (select etapa_id from public.negocios where apolice_renovada_id = '00000000-0000-0000-0000-0000000001a1') <> '00000000-0000-0000-0000-0000000001e1' then
    raise exception 'FALHA: negócio não entrou na etapa de renovação'; end if;
  if (select vendedor_usuario_id from public.negocios where apolice_renovada_id = '00000000-0000-0000-0000-0000000001a1') <> '00000000-0000-0000-0000-0000000001aa' then
    raise exception 'FALHA: vendedor deveria cair no dono da conta'; end if;
  if exists (select 1 from public.negocios where apolice_renovada_id in ('00000000-0000-0000-0000-0000000001a2','00000000-0000-0000-0000-0000000001a3','00000000-0000-0000-0000-0000000001a4','00000000-0000-0000-0000-0000000002a1')) then
    raise exception 'FALHA: criou negócio para apólice fora da janela, cancelada, vencida ou sem fluxo'; end if;
end $$;

-- Negócio de renovação apagado pelo corretor não volta no dia seguinte
delete from public.negocios where apolice_renovada_id = '00000000-0000-0000-0000-0000000001a1';
do $$
begin
  perform public.criar_negocios_renovacao('2026-10-03');
  if exists (select 1 from public.negocios where apolice_renovada_id = '00000000-0000-0000-0000-0000000001a1') then
    raise exception 'FALHA: negócio de renovação apagado voltou a ser criado'; end if;
end $$;

-- Sem etapa marcada: cai na primeira etapa por ordem (zera a marca para gerar de novo)
update public.etapas set renovacao = false where fluxo_id = '00000000-0000-0000-0000-0000000001f0';
update public.apolices set renovacao_gerada_em = null where id = '00000000-0000-0000-0000-0000000001a1';
do $$
begin
  perform public.criar_negocios_renovacao('2026-10-02');
  if (select etapa_id from public.negocios where apolice_renovada_id = '00000000-0000-0000-0000-0000000001a1') <> '00000000-0000-0000-0000-0000000001e0' then
    raise exception 'FALHA: sem etapa marcada deveria cair na primeira etapa'; end if;
end $$;

select 'RENOVACAO OK' as resultado;
rollback;
