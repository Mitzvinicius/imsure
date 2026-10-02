-- Prova que a conta B não enxerga nem altera dados de seguros da conta A.
-- Roda dentro de uma transação e desfaz tudo no final.
begin;

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000aa', 'rls-a@teste.local', 'authenticated', 'authenticated', '{"nome":"Teste A"}'),
  ('00000000-0000-0000-0000-0000000000bb', 'rls-b@teste.local', 'authenticated', 'authenticated', '{"nome":"Teste B"}');

insert into public.contas (id, nome, plano_id, owner_usuario_id)
select '00000000-0000-0000-0000-00000000c0aa', 'Conta A', (select id from public.planos limit 1), '00000000-0000-0000-0000-0000000000aa';
insert into public.corretoras (id, conta_id, nome, onboarding_concluido)
values ('00000000-0000-0000-0000-00000000c1aa', '00000000-0000-0000-0000-00000000c0aa', 'Corretora A', true);
insert into public.contatos (id, corretora_id, nome, tipo_pessoa)
values ('00000000-0000-0000-0000-00000000c2aa', '00000000-0000-0000-0000-00000000c1aa', 'Cliente A', 'fisica');
insert into public.apolices (id, corretora_id, contato_id, seguradora_id, ramo, numero, inicio_vigencia, fim_vigencia, forma_pagamento)
values ('00000000-0000-0000-0000-00000000a0aa', '00000000-0000-0000-0000-00000000c1aa', '00000000-0000-0000-0000-00000000c2aa',
        (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'RLS-1', '2026-01-01', '2027-01-01', 'boleto');
insert into public.parcelas (apolice_id, numero, vencimento, valor) values ('00000000-0000-0000-0000-00000000a0aa', 1, '2026-02-01', 100);
insert into public.coberturas (apolice_id, nome) values ('00000000-0000-0000-0000-00000000a0aa', 'Casco');
insert into public.bens_auto (apolice_id, placa) values ('00000000-0000-0000-0000-00000000a0aa', 'RLS0A00');
insert into public.endossos (id, apolice_id, numero, tipo) values ('00000000-0000-0000-0000-00000000e0aa', '00000000-0000-0000-0000-00000000a0aa', '1', 'inclusao');
insert into public.vidas_seguradas (id, apolice_id, nome) values ('00000000-0000-0000-0000-00000000f0aa', '00000000-0000-0000-0000-00000000a0aa', 'Vida A');
insert into public.beneficiarios (vida_segurada_id, nome, percentual) values ('00000000-0000-0000-0000-00000000f0aa', 'Benef A', 100);

-- Como B
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.apolices) <> 0 then raise exception 'FALHA: B vê apólices de A'; end if;
  if (select count(*) from public.parcelas) <> 0 then raise exception 'FALHA: B vê parcelas de A'; end if;
  if (select count(*) from public.coberturas) <> 0 then raise exception 'FALHA: B vê coberturas de A'; end if;
  if (select count(*) from public.bens_auto) <> 0 then raise exception 'FALHA: B vê bens de A'; end if;
  if (select count(*) from public.endossos) <> 0 then raise exception 'FALHA: B vê endossos de A'; end if;
  if (select count(*) from public.vidas_seguradas) <> 0 then raise exception 'FALHA: B vê vidas de A'; end if;
  if (select count(*) from public.beneficiarios) <> 0 then raise exception 'FALHA: B vê beneficiários de A'; end if;
  if (select count(*) from public.seguradoras) = 0 then raise exception 'FALHA: B não vê a lista de seguradoras'; end if;

  begin
    insert into public.parcelas (apolice_id, numero, vencimento, valor) values ('00000000-0000-0000-0000-00000000a0aa', 99, '2026-03-01', 10);
    raise exception 'FALHA: B inseriu parcela na apólice de A';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.seguradoras (nome) values ('Seguradora pirata');
    raise exception 'FALHA: B inseriu seguradora';
  exception when insufficient_privilege then null;
  end;

  update public.apolices set numero = 'HACK' where id = '00000000-0000-0000-0000-00000000a0aa';
  if found then raise exception 'FALHA: B alterou apólice de A'; end if;
end $$;

-- Como A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.apolices) <> 1 then raise exception 'FALHA: A não vê a própria apólice'; end if;
  if (select count(*) from public.parcelas) <> 1 then raise exception 'FALHA: A não vê a própria parcela'; end if;
  if (select count(*) from public.beneficiarios) <> 1 then raise exception 'FALHA: A não vê o próprio beneficiário'; end if;
  insert into public.parcelas (apolice_id, endosso_id, numero, vencimento, valor)
    values ('00000000-0000-0000-0000-00000000a0aa', '00000000-0000-0000-0000-00000000e0aa', 1, '2026-04-01', 50);
end $$;

reset role;
select 'RLS OK' as resultado;
rollback;
