-- Tarefas e conversa: visibilidade, atribuição, menções, outra corretora, cascade. Rodar com execute_sql; desfaz tudo.
begin;
insert into auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000a0a0','tr-dono@teste.local','authenticated','authenticated','{"nome":"Dono TR"}', now()),
  ('00000000-0000-0000-0000-00000000a0b1','tr-p1@teste.local','authenticated','authenticated','{"nome":"P1 TR"}', now()),
  ('00000000-0000-0000-0000-00000000a0b2','tr-p2@teste.local','authenticated','authenticated','{"nome":"P2 TR"}', now()),
  ('00000000-0000-0000-0000-00000000a0c0','tr-fora@teste.local','authenticated','authenticated','{"nome":"Fora TR"}', now());
insert into public.contas (id, nome, plano_id, owner_usuario_id) values
  ('00000000-0000-0000-0000-00000000a0c9','Conta TR',(select id from public.planos where nome='Pro'),'00000000-0000-0000-0000-00000000a0a0'),
  ('00000000-0000-0000-0000-00000000a0c8','Conta Fora',(select id from public.planos where nome='Starter'),'00000000-0000-0000-0000-00000000a0c0');
insert into public.corretoras (id, conta_id, nome, onboarding_concluido) values
  ('00000000-0000-0000-0000-00000000a0e1','00000000-0000-0000-0000-00000000a0c9','TR',true),
  ('00000000-0000-0000-0000-00000000a0e2','00000000-0000-0000-0000-00000000a0c8','Fora',true);
insert into public.usuario_corretora (usuario_id, corretora_id, cargo_id)
select u, '00000000-0000-0000-0000-00000000a0e1', (select id from public.cargos where corretora_id='00000000-0000-0000-0000-00000000a0e1' and chave='produtor')
from unnest(array['00000000-0000-0000-0000-00000000a0b1'::uuid,'00000000-0000-0000-0000-00000000a0b2'::uuid]) u;
insert into public.contatos (id, corretora_id, nome, tipo_pessoa, criado_por_usuario_id) values
  ('00000000-0000-0000-0000-00000000a0d2','00000000-0000-0000-0000-00000000a0e1','Cliente de P2','fisica','00000000-0000-0000-0000-00000000a0b2'),
  ('00000000-0000-0000-0000-00000000a0d9','00000000-0000-0000-0000-00000000a0e2','Cliente de Fora','fisica','00000000-0000-0000-0000-00000000a0c0');
insert into public.apolices (id, corretora_id, contato_id, seguradora_id, ramo, numero, inicio_vigencia, fim_vigencia, forma_pagamento, responsavel_usuario_id) values
  ('00000000-0000-0000-0000-00000000a0f2','00000000-0000-0000-0000-00000000a0e1','00000000-0000-0000-0000-00000000a0d2',(select id from public.seguradoras order by nome limit 1),'Automóvel','TR-2','2026-01-01','2027-01-01','boleto','00000000-0000-0000-0000-00000000a0b2');
insert into public.sinistros (id, apolice_id, data_ocorrencia, tipo) values
  ('00000000-0000-0000-0000-00000000a051','00000000-0000-0000-0000-00000000a0f2','2026-09-01','Colisão');

set local role authenticated;

-- P2 (dono da apólice)
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000a0b2","role":"authenticated"}',true);
do $$ begin
  insert into public.tarefas (id, corretora_id, titulo, responsavel_usuario_id, criado_por, apolice_id) values
    ('00000000-0000-0000-0000-00000000a071','00000000-0000-0000-0000-00000000a0e1','Cobrar vistoria','00000000-0000-0000-0000-00000000a0b2','00000000-0000-0000-0000-00000000a0b2','00000000-0000-0000-0000-00000000a0f2');
  insert into public.tarefas (id, corretora_id, titulo, responsavel_usuario_id, criado_por, sinistro_id) values
    ('00000000-0000-0000-0000-00000000a073','00000000-0000-0000-0000-00000000a0e1','Mandar BO','00000000-0000-0000-0000-00000000a0b2','00000000-0000-0000-0000-00000000a0b2','00000000-0000-0000-0000-00000000a051');
  begin
    insert into public.tarefas (corretora_id, titulo, responsavel_usuario_id, criado_por, apolice_id) values
      ('00000000-0000-0000-0000-00000000a0e1','Para P1','00000000-0000-0000-0000-00000000a0b1','00000000-0000-0000-0000-00000000a0b2','00000000-0000-0000-0000-00000000a0f2');
    raise exception 'FALHA: atribuiu tarefa da apólice a quem não vê a apólice';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.tarefas (corretora_id, titulo, responsavel_usuario_id, criado_por, contato_id) values
      ('00000000-0000-0000-0000-00000000a0e1','Forjada','00000000-0000-0000-0000-00000000a0b2','00000000-0000-0000-0000-00000000a0b2','00000000-0000-0000-0000-00000000a0d9');
    raise exception 'FALHA: aceitou tarefa ligada a contato de outra corretora';
  exception when check_violation or insufficient_privilege then null; end;
  begin
    perform public.comentar('00000000-0000-0000-0000-00000000a0e1', 'Olha isso @P1 TR', array['00000000-0000-0000-0000-00000000a0b1'::uuid], null, '00000000-0000-0000-0000-00000000a0f2', null, null, null);
    raise exception 'FALHA: mencionou quem não vê a apólice';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.comentarios where apolice_id = '00000000-0000-0000-0000-00000000a0f2') <> 0 then
    raise exception 'FALHA: menção recusada deixou o comentário gravado';
  end if;
  perform public.comentar('00000000-0000-0000-0000-00000000a0e1', 'Chefe, @Dono TR veja', array['00000000-0000-0000-0000-00000000a0a0'::uuid], null, '00000000-0000-0000-0000-00000000a0f2', null, null, null);
  if (select count(*) from public.comentario_mencoes m join public.comentarios c on c.id = m.comentario_id where c.apolice_id = '00000000-0000-0000-0000-00000000a0f2') <> 1 then
    raise exception 'FALHA: menção ao dono não gravou';
  end if;
  begin
    perform public.comentar('00000000-0000-0000-0000-00000000a0e2', 'forjado', '{}', null, null, null, '00000000-0000-0000-0000-00000000a0d9', null);
    raise exception 'FALHA: comentou em contato de outra corretora';
  exception when check_violation or insufficient_privilege then null; end;
  -- responsável repassa a tarefa para quem vê a apólice
  update public.tarefas set responsavel_usuario_id = '00000000-0000-0000-0000-00000000a0a0' where id = '00000000-0000-0000-0000-00000000a071';
  if not found then raise exception 'FALHA: responsável não conseguiu repassar a tarefa'; end if;
end $$;

-- P1 (colega, não vê a apólice de P2)
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000a0b1","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.tarefas where id in ('00000000-0000-0000-0000-00000000a071','00000000-0000-0000-0000-00000000a073')) <> 0 then
    raise exception 'FALHA: P1 vê tarefa ligada a apólice/sinistro de colega';
  end if;
  if (select count(*) from public.comentarios where apolice_id = '00000000-0000-0000-0000-00000000a0f2') <> 0 then raise exception 'FALHA: P1 vê conversa da apólice de colega'; end if;
  if (select count(*) from public.membros_que_veem_registro('00000000-0000-0000-0000-00000000a0e1', null, '00000000-0000-0000-0000-00000000a0f2', null, null, null)) <> 0 then
    raise exception 'FALHA: P1 listou membros de um registro que não vê';
  end if;
  if (select count(*) from public.buscar_registros('00000000-0000-0000-0000-00000000a0e1', 'TR-2')) <> 0 then raise exception 'FALHA: busca mostrou apólice de colega'; end if;
  begin
    perform public.escopo_de('00000000-0000-0000-0000-00000000a0b2', '00000000-0000-0000-0000-00000000a0e1');
    raise exception 'FALHA: escopo_de de outra pessoa exposto via RPC';
  exception when insufficient_privilege then null; end;
  begin
    perform public.ve_alvo_de('00000000-0000-0000-0000-00000000a0b2', null, '00000000-0000-0000-0000-00000000a0f2', null, null, null);
    raise exception 'FALHA: ve_alvo_de de outra pessoa exposto via RPC';
  exception when insufficient_privilege then null; end;
end $$;

-- Dono (Administrador, escopo tudo)
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000a0a0","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.tarefas where id = '00000000-0000-0000-0000-00000000a071') <> 1 then raise exception 'FALHA: dono não vê tarefa da apólice'; end if;
  if (select count(*) from public.membros_que_veem_registro('00000000-0000-0000-0000-00000000a0e1', null, '00000000-0000-0000-0000-00000000a0f2', null, null, null)) <> 2 then
    raise exception 'FALHA: membros que veem a apólice deveriam ser dono e P2';
  end if;
  if (select count(*) from public.buscar_registros('00000000-0000-0000-0000-00000000a0e1', 'TR-2') where tipo = 'apolice') <> 1 then raise exception 'FALHA: busca do dono não achou a apólice'; end if;
  insert into public.tarefas (id, corretora_id, titulo, responsavel_usuario_id, criado_por) values
    ('00000000-0000-0000-0000-00000000a072','00000000-0000-0000-0000-00000000a0e1','Avulsa para P1','00000000-0000-0000-0000-00000000a0b1','00000000-0000-0000-0000-00000000a0a0');
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000a0b2","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.tarefas where id = '00000000-0000-0000-0000-00000000a072') <> 0 then raise exception 'FALHA: P2 vê tarefa avulsa de P1'; end if;
  update public.tarefas set titulo = 'hack' where id = '00000000-0000-0000-0000-00000000a072';
  if found then raise exception 'FALHA: P2 editou tarefa que não vê'; end if;
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000a0b1","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.tarefas where id = '00000000-0000-0000-0000-00000000a072') <> 1 then raise exception 'FALHA: P1 não vê a própria tarefa avulsa'; end if;
  update public.tarefas set status = 'concluida' where id = '00000000-0000-0000-0000-00000000a072';
  if (select concluida_em from public.tarefas where id = '00000000-0000-0000-0000-00000000a072') is null then raise exception 'FALHA: concluida_em não preenchido'; end if;
  update public.tarefas set status = 'a_fazer' where id = '00000000-0000-0000-0000-00000000a072';
  if (select concluida_em from public.tarefas where id = '00000000-0000-0000-0000-00000000a072') is not null then raise exception 'FALHA: concluida_em não limpou ao reabrir'; end if;
  update public.tarefas set criado_por = '00000000-0000-0000-0000-00000000a0b1' where id = '00000000-0000-0000-0000-00000000a072';
  if (select criado_por from public.tarefas where id = '00000000-0000-0000-0000-00000000a072') <> '00000000-0000-0000-0000-00000000a0a0' then raise exception 'FALHA: criado_por foi alterado'; end if;
end $$;

-- P1 desativado: dono continua vendo e reatribui
reset role;
update public.usuario_corretora set ativo = false where usuario_id = '00000000-0000-0000-0000-00000000a0b1' and corretora_id = '00000000-0000-0000-0000-00000000a0e1';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000a0a0","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.tarefas where id = '00000000-0000-0000-0000-00000000a072') <> 1 then raise exception 'FALHA: dono perdeu tarefa de membro desativado'; end if;
  update public.tarefas set responsavel_usuario_id = '00000000-0000-0000-0000-00000000a0b2' where id = '00000000-0000-0000-0000-00000000a072';
  if not found then raise exception 'FALHA: dono não reatribuiu tarefa de membro desativado'; end if;
  begin
    update public.tarefas set responsavel_usuario_id = '00000000-0000-0000-0000-00000000a0b1' where id = '00000000-0000-0000-0000-00000000a072';
    raise exception 'FALHA: atribuiu tarefa a membro desativado';
  exception when insufficient_privilege then null; end;
end $$;

-- Usuário de fora não vê nada
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000a0c0","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.tarefas where corretora_id = '00000000-0000-0000-0000-00000000a0e1') <> 0 then raise exception 'FALHA: usuário de fora vê tarefas'; end if;
  if (select count(*) from public.comentarios where corretora_id = '00000000-0000-0000-0000-00000000a0e1') <> 0 then raise exception 'FALHA: usuário de fora vê comentários'; end if;
end $$;

-- Excluir o registro leva tarefas e comentários junto
reset role;
delete from public.sinistros where id = '00000000-0000-0000-0000-00000000a051';
delete from public.apolices where id = '00000000-0000-0000-0000-00000000a0f2';
do $$ begin
  if exists (select 1 from public.tarefas where id in ('00000000-0000-0000-0000-00000000a071','00000000-0000-0000-0000-00000000a073')) then raise exception 'FALHA: tarefas não foram excluídas com o registro'; end if;
  if exists (select 1 from public.comentarios where corretora_id = '00000000-0000-0000-0000-00000000a0e1') then raise exception 'FALHA: comentários não foram excluídos com o registro'; end if;
end $$;
select 'TAREFAS RLS OK' as resultado;
rollback;
