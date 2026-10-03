-- Patrimônio e saúde: isolamento, bem só liga com apólice do mesmo cliente, um registro de saúde por contato.
begin;
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000006aa', 'pat-a@teste.local', 'authenticated', 'authenticated', '{"nome":"A"}'),
  ('00000000-0000-0000-0000-0000000006bb', 'pat-b@teste.local', 'authenticated', 'authenticated', '{"nome":"B"}');
insert into public.contas (id, nome, plano_id, owner_usuario_id)
select '00000000-0000-0000-0000-0000000006c0', 'A', (select id from public.planos limit 1), '00000000-0000-0000-0000-0000000006aa';
insert into public.corretoras (id, conta_id, nome) values ('00000000-0000-0000-0000-0000000006c1', '00000000-0000-0000-0000-0000000006c0', 'A1');
insert into public.contatos (id, corretora_id, nome, tipo_pessoa) values
  ('00000000-0000-0000-0000-0000000006d1', '00000000-0000-0000-0000-0000000006c1', 'João', 'fisica'),
  ('00000000-0000-0000-0000-0000000006d2', '00000000-0000-0000-0000-0000000006c1', 'Maria', 'fisica');
insert into public.apolices (id, corretora_id, contato_id, seguradora_id, ramo, numero, inicio_vigencia, fim_vigencia, forma_pagamento, responsavel_usuario_id) values
  ('00000000-0000-0000-0000-0000000006a1', '00000000-0000-0000-0000-0000000006c1', '00000000-0000-0000-0000-0000000006d1', (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'PAT-1', '2026-01-01', '2027-01-01', 'boleto', '00000000-0000-0000-0000-0000000006aa'),
  ('00000000-0000-0000-0000-0000000006a2', '00000000-0000-0000-0000-0000000006c1', '00000000-0000-0000-0000-0000000006d2', (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'PAT-2', '2026-01-01', '2027-01-01', 'boleto', '00000000-0000-0000-0000-0000000006aa');
insert into public.contato_bens (id, corretora_id, contato_id, tipo, descricao, valor_estimado, placa)
  values ('00000000-0000-0000-0000-0000000006b1', '00000000-0000-0000-0000-0000000006c1', '00000000-0000-0000-0000-0000000006d1', 'veiculo', 'Civic 2022', 120000, 'ABC1D23');
insert into public.contato_bem_apolices (bem_id, apolice_id, contato_id)
  values ('00000000-0000-0000-0000-0000000006b1', '00000000-0000-0000-0000-0000000006a1', '00000000-0000-0000-0000-0000000006d1');
insert into public.contato_saude (contato_id, corretora_id, peso_kg, altura_m)
  values ('00000000-0000-0000-0000-0000000006d1', '00000000-0000-0000-0000-0000000006c1', 72.5, 1.75);

do $$ begin
  begin
    insert into public.contato_bem_apolices (bem_id, apolice_id, contato_id)
      values ('00000000-0000-0000-0000-0000000006b1', '00000000-0000-0000-0000-0000000006a2', '00000000-0000-0000-0000-0000000006d1');
    raise exception 'FALHA: ligou bem do João à apólice da Maria';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.contato_saude (contato_id, corretora_id, peso_kg) values ('00000000-0000-0000-0000-0000000006d1', '00000000-0000-0000-0000-0000000006c1', 80);
    raise exception 'FALHA: dois registros de saúde para o mesmo contato';
  exception when unique_violation then null;
  end;
  begin
    insert into public.contato_bens (corretora_id, contato_id, tipo, descricao) values ('00000000-0000-0000-0000-0000000006c1', '00000000-0000-0000-0000-0000000006d1', 'barco', 'X');
    raise exception 'FALHA: aceitou tipo de bem inválido';
  exception when check_violation then null;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000006bb","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.contato_bens) <> 0 then raise exception 'FALHA: B vê bens de A'; end if;
  if (select count(*) from public.contato_bem_apolices) <> 0 then raise exception 'FALHA: B vê vínculos bem-apólice de A'; end if;
  if (select count(*) from public.contato_saude) <> 0 then raise exception 'FALHA: B vê saúde de A'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000006aa","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.contato_bens) <> 1 then raise exception 'FALHA: A não vê o próprio bem'; end if;
  if (select count(*) from public.contato_bem_apolices) <> 1 then raise exception 'FALHA: A não vê o próprio vínculo'; end if;
  if (select peso_kg from public.contato_saude) <> 72.5 then raise exception 'FALHA: A não vê a própria saúde'; end if;
end $$;
reset role;
select 'PATRIMONIO SAUDE OK' as resultado;
rollback;
