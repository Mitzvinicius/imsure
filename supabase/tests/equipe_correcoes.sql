-- Achados da revisão final da equipe (C1–C3, I1–I3). Transação desfeita no final.
begin;
insert into auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000008a0','fx-dono@teste.local','authenticated','authenticated','{"nome":"Dono"}', now()),
  ('00000000-0000-0000-0000-0000000008b0','fx-fin@teste.local','authenticated','authenticated','{"nome":"Fin"}', now()),
  ('00000000-0000-0000-0000-0000000008c0','fx-prod@teste.local','authenticated','authenticated','{"nome":"Prod"}', now()),
  ('00000000-0000-0000-0000-0000000008d0','fx-semconf@teste.local','authenticated','authenticated','{"nome":"SemConf"}', null);
insert into public.contas (id, nome, plano_id, owner_usuario_id)
select '00000000-0000-0000-0000-0000000008c9','Conta Fx',(select id from public.planos where nome='Pro'),'00000000-0000-0000-0000-0000000008a0';
insert into public.corretoras (id, conta_id, nome, onboarding_concluido) values
  ('00000000-0000-0000-0000-0000000008e1','00000000-0000-0000-0000-0000000008c9','Fx 1',true),
  ('00000000-0000-0000-0000-0000000008e2','00000000-0000-0000-0000-0000000008c9','Fx 2',true);
insert into public.usuario_corretora (usuario_id, corretora_id, cargo_id) values
  ('00000000-0000-0000-0000-0000000008b0','00000000-0000-0000-0000-0000000008e1',(select id from public.cargos where corretora_id='00000000-0000-0000-0000-0000000008e1' and chave='financeiro')),
  ('00000000-0000-0000-0000-0000000008c0','00000000-0000-0000-0000-0000000008e1',(select id from public.cargos where corretora_id='00000000-0000-0000-0000-0000000008e1' and chave='produtor')),
  ('00000000-0000-0000-0000-0000000008c0','00000000-0000-0000-0000-0000000008e2',(select id from public.cargos where corretora_id='00000000-0000-0000-0000-0000000008e2' and chave='produtor'));
insert into public.fluxos (id, corretora_id, nome, ativo) values
  ('00000000-0000-0000-0000-0000000008f1','00000000-0000-0000-0000-0000000008e1','F1',true),
  ('00000000-0000-0000-0000-0000000008f2','00000000-0000-0000-0000-0000000008e2','F2',true);
insert into public.etapas (id, fluxo_id, nome, ordem) values
  ('00000000-0000-0000-0000-000000000811','00000000-0000-0000-0000-0000000008f1','Novo',0),
  ('00000000-0000-0000-0000-000000000812','00000000-0000-0000-0000-0000000008f2','Novo',0);
insert into public.convites (corretora_id, email, cargo_id, token_hash, criado_por) values
  ('00000000-0000-0000-0000-0000000008e1','fx-semconf@teste.local',(select id from public.cargos where corretora_id='00000000-0000-0000-0000-0000000008e1' and chave='produtor'),
   encode(sha256(convert_to('token-semconf','UTF8')),'hex'),'00000000-0000-0000-0000-0000000008a0');

set local role authenticated;

-- C1: produtor cria contato, apólice e negócio lendo de volta (insert ... returning)
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000008c0","role":"authenticated"}',true);
do $$
declare v_contato uuid; v_apolice uuid; v_negocio uuid;
begin
  insert into public.contatos (corretora_id, nome, tipo_pessoa) values ('00000000-0000-0000-0000-0000000008e1','Novo cliente','fisica') returning id into v_contato;
  insert into public.apolices (corretora_id, contato_id, seguradora_id, ramo, numero, inicio_vigencia, fim_vigencia, forma_pagamento)
    values ('00000000-0000-0000-0000-0000000008e1', v_contato, (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'FX-1', '2026-01-01', '2027-01-01', 'boleto')
    returning id into v_apolice;
  insert into public.negocios (etapa_id, contato_id, vendedor_usuario_id, tipo, ramo)
    values ('00000000-0000-0000-0000-000000000811', v_contato, '00000000-0000-0000-0000-0000000008c0', 'Seguro novo', 'Automóvel')
    returning id into v_negocio;
  if v_contato is null or v_apolice is null or v_negocio is null then raise exception 'FALHA: insert returning não devolveu id'; end if;
  perform set_config('test.apolice', v_apolice::text, true);
  perform set_config('test.contato', v_contato::text, true);
  perform set_config('test.negocio', v_negocio::text, true);

  -- I2: não move apólice/negócio para outra corretora nem troca o criador do contato
  begin
    update public.apolices set corretora_id = '00000000-0000-0000-0000-0000000008e2' where id = v_apolice;
    raise exception 'FALHA: moveu apólice para outra corretora';
  exception when insufficient_privilege then null; end;
  begin
    update public.negocios set etapa_id = '00000000-0000-0000-0000-000000000812' where id = v_negocio;
    raise exception 'FALHA: moveu negócio para outra corretora';
  exception when insufficient_privilege then null; end;
  begin
    update public.contatos set criado_por_usuario_id = '00000000-0000-0000-0000-0000000008a0' where id = v_contato;
    raise exception 'FALHA: trocou o criador do contato';
  exception when insufficient_privilege then null; end;
end $$;

-- C2: financeiro troca o plano mas não vira dono nem ganha vagas extras
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000008b0","role":"authenticated"}',true);
do $$ begin
  update public.contas set plano_id = (select id from public.planos where nome='Business') where id = '00000000-0000-0000-0000-0000000008c9';
  if not found then raise exception 'FALHA: financeiro não conseguiu trocar o plano'; end if;
  begin
    update public.contas set owner_usuario_id = '00000000-0000-0000-0000-0000000008b0' where id = '00000000-0000-0000-0000-0000000008c9';
    raise exception 'FALHA: financeiro virou dono da conta';
  exception when insufficient_privilege then null; end;
  begin
    update public.contas set usuarios_extras = 999 where id = '00000000-0000-0000-0000-0000000008c9';
    raise exception 'FALHA: financeiro ganhou vagas extras';
  exception when insufficient_privilege then null; end;
end $$;

-- I1: admin não reescreve a linha de membro para outro usuário
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000008a0","role":"authenticated"}',true);
do $$ begin
  begin
    update public.usuario_corretora set usuario_id = '00000000-0000-0000-0000-0000000008d0'
    where usuario_id = '00000000-0000-0000-0000-0000000008b0' and corretora_id = '00000000-0000-0000-0000-0000000008e1';
    raise exception 'FALHA: reescreveu membro para outro usuário';
  exception when insufficient_privilege then null; end;
end $$;

-- C3: reativar membro respeita o limite (volta para Starter = 2; dono + prod ativos)
reset role;
update public.contas set plano_id = (select id from public.planos where nome='Starter') where id = '00000000-0000-0000-0000-0000000008c9';
update public.usuario_corretora set ativo = false where usuario_id = '00000000-0000-0000-0000-0000000008b0';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000008a0","role":"authenticated"}',true);
do $$ begin
  begin
    update public.usuario_corretora set ativo = true where usuario_id = '00000000-0000-0000-0000-0000000008b0' and corretora_id = '00000000-0000-0000-0000-0000000008e1';
    raise exception 'FALHA: reativou membro acima do limite do plano';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
    if sqlerrm not like '%permite 2 usuários%' then raise exception 'FALHA: mensagem inesperada: %', sqlerrm; end if;
  end;
end $$;

-- I3: e-mail não confirmado não aceita convite
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000008d0","role":"authenticated"}',true);
do $$ begin
  begin
    perform public.aceitar_convite('token-semconf');
    raise exception 'FALHA: aceitou convite com e-mail não confirmado';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;

reset role;
select 'EQUIPE CORRECOES OK' as resultado;
rollback;
