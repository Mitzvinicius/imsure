-- Vínculos familiares: isolamento entre contas, par único nos dois sentidos, mesma corretora.
begin;
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000005aa', 'vin-a@teste.local', 'authenticated', 'authenticated', '{"nome":"A"}'),
  ('00000000-0000-0000-0000-0000000005bb', 'vin-b@teste.local', 'authenticated', 'authenticated', '{"nome":"B"}');
insert into public.contas (id, nome, plano_id, owner_usuario_id)
select '00000000-0000-0000-0000-0000000005c0', 'A', (select id from public.planos limit 1), '00000000-0000-0000-0000-0000000005aa';
insert into public.corretoras (id, conta_id, nome) values
  ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005c0', 'A1'),
  ('00000000-0000-0000-0000-0000000005c2', '00000000-0000-0000-0000-0000000005c0', 'A2');
insert into public.contatos (id, corretora_id, nome, tipo_pessoa, estado_civil, renda_mensal) values
  ('00000000-0000-0000-0000-0000000005d1', '00000000-0000-0000-0000-0000000005c1', 'João', 'fisica', 'casado', 8500),
  ('00000000-0000-0000-0000-0000000005d2', '00000000-0000-0000-0000-0000000005c1', 'Maria', 'fisica', 'casado', null),
  ('00000000-0000-0000-0000-0000000005d3', '00000000-0000-0000-0000-0000000005c2', 'Outra corretora', 'fisica', null, null);
insert into public.contato_vinculos (corretora_id, contato_id, parente_id, parentesco)
  values ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005d1', '00000000-0000-0000-0000-0000000005d2', 'conjuge');

do $$ begin
  begin
    insert into public.contato_vinculos (corretora_id, contato_id, parente_id, parentesco)
      values ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005d2', '00000000-0000-0000-0000-0000000005d1', 'conjuge');
    raise exception 'FALHA: aceitou o mesmo par no sentido inverso';
  exception when unique_violation then
    if sqlerrm not like '%contato_vinculos_par_key%' then raise exception 'FALHA: nome inesperado %', sqlerrm; end if;
  end;
  begin
    insert into public.contato_vinculos (corretora_id, contato_id, parente_id, parentesco)
      values ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005d1', '00000000-0000-0000-0000-0000000005d3', 'irmao');
    raise exception 'FALHA: vinculou contato de outra corretora';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.contato_vinculos (corretora_id, contato_id, parente_id, parentesco)
      values ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005d1', '00000000-0000-0000-0000-0000000005d1', 'irmao');
    raise exception 'FALHA: vinculou contato com ele mesmo';
  exception when check_violation then null;
  end;
  begin
    update public.contatos set estado_civil = 'enrolado' where id = '00000000-0000-0000-0000-0000000005d1';
    raise exception 'FALHA: aceitou estado civil inválido';
  exception when check_violation then null;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000005bb","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.contato_vinculos) <> 0 then raise exception 'FALHA: B vê vínculos de A'; end if;
  begin
    insert into public.contato_vinculos (corretora_id, contato_id, parente_id, parentesco)
      values ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005d2', '00000000-0000-0000-0000-0000000005d1', 'filho');
    raise exception 'FALHA: B criou vínculo na corretora de A';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000005aa","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.contato_vinculos) <> 1 then raise exception 'FALHA: A não vê o próprio vínculo'; end if;
end $$;
reset role;
select 'VINCULOS OK' as resultado;
rollback;
