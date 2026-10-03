-- Edição de tarefas (achados da revisão final): repassar tarefa avulsa e concluir tarefa de registro que saiu da carteira.
-- Rodar com execute_sql; desfaz tudo.
begin;
insert into auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000c1a0','te-dono@teste.local','authenticated','authenticated','{"nome":"Dono TE"}', now()),
  ('00000000-0000-0000-0000-00000000c1b1','te-p1@teste.local','authenticated','authenticated','{"nome":"P1 TE"}', now()),
  ('00000000-0000-0000-0000-00000000c1b2','te-p2@teste.local','authenticated','authenticated','{"nome":"P2 TE"}', now());
insert into public.contas (id, nome, plano_id, owner_usuario_id)
select '00000000-0000-0000-0000-00000000c1c9','Conta TE',(select id from public.planos where nome='Pro'),'00000000-0000-0000-0000-00000000c1a0';
insert into public.corretoras (id, conta_id, nome, onboarding_concluido) values ('00000000-0000-0000-0000-00000000c1e1','00000000-0000-0000-0000-00000000c1c9','TE',true);
insert into public.usuario_corretora (usuario_id, corretora_id, cargo_id)
select u, '00000000-0000-0000-0000-00000000c1e1', (select id from public.cargos where corretora_id='00000000-0000-0000-0000-00000000c1e1' and chave='produtor')
from unnest(array['00000000-0000-0000-0000-00000000c1b1'::uuid,'00000000-0000-0000-0000-00000000c1b2'::uuid]) u;
insert into public.contatos (id, corretora_id, nome, tipo_pessoa, criado_por_usuario_id) values
  ('00000000-0000-0000-0000-00000000c1d1','00000000-0000-0000-0000-00000000c1e1','Cliente TE','fisica','00000000-0000-0000-0000-00000000c1a0');
insert into public.apolices (id, corretora_id, contato_id, seguradora_id, ramo, numero, inicio_vigencia, fim_vigencia, forma_pagamento, responsavel_usuario_id) values
  ('00000000-0000-0000-0000-00000000c1f1','00000000-0000-0000-0000-00000000c1e1','00000000-0000-0000-0000-00000000c1d1',(select id from public.seguradoras order by nome limit 1),'Automóvel','TE-1','2026-01-01','2027-01-01','boleto','00000000-0000-0000-0000-00000000c1b1');

set local role authenticated;

-- Dono cria tarefa avulsa para P1
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000c1a0","role":"authenticated"}',true);
insert into public.tarefas (id, corretora_id, titulo, responsavel_usuario_id, criado_por) values
  ('00000000-0000-0000-0000-00000000c171','00000000-0000-0000-0000-00000000c1e1','Avulsa','00000000-0000-0000-0000-00000000c1b1','00000000-0000-0000-0000-00000000c1a0');

-- P1 cria tarefa na própria apólice
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000c1b1","role":"authenticated"}',true);
insert into public.tarefas (id, corretora_id, titulo, responsavel_usuario_id, criado_por, apolice_id) values
  ('00000000-0000-0000-0000-00000000c172','00000000-0000-0000-0000-00000000c1e1','Da apólice','00000000-0000-0000-0000-00000000c1b1','00000000-0000-0000-0000-00000000c1b1','00000000-0000-0000-0000-00000000c1f1');

-- P2 não edita tarefa que não vê
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000c1b2","role":"authenticated"}',true);
do $$ begin
  begin
    perform public.alterar_status_tarefa('00000000-0000-0000-0000-00000000c171', 'concluida');
    raise exception 'FALHA: P2 alterou tarefa que não vê';
  exception when insufficient_privilege then null; end;
end $$;

-- P1 (responsável) repassa a avulsa para P2, mesmo deixando de enxergá-la
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000c1b1","role":"authenticated"}',true);
do $$ begin
  perform public.atualizar_tarefa('00000000-0000-0000-0000-00000000c171', 'Avulsa', null, '00000000-0000-0000-0000-00000000c1b2', null, null, 'alta', 'a_fazer');
  if (select count(*) from public.tarefas where id = '00000000-0000-0000-0000-00000000c171') <> 0 then raise exception 'FALHA: P1 ainda vê a tarefa repassada'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000c1b2","role":"authenticated"}',true);
do $$ begin
  if (select prioridade from public.tarefas where id = '00000000-0000-0000-0000-00000000c171') is distinct from 'alta' then raise exception 'FALHA: P2 não recebeu a tarefa repassada'; end if;
end $$;

-- Apólice sai da carteira de P1: ele continua responsável pela tarefa, conclui e vê quem pode assumir
reset role;
select set_config('request.jwt.claims','',true);
update public.apolices set responsavel_usuario_id = '00000000-0000-0000-0000-00000000c1b2' where id = '00000000-0000-0000-0000-00000000c1f1';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000c1b1","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.tarefas where id = '00000000-0000-0000-0000-00000000c172') <> 1 then raise exception 'FALHA: responsável perdeu a tarefa'; end if;
  perform public.alterar_status_tarefa('00000000-0000-0000-0000-00000000c172', 'concluida');
  if (select status from public.tarefas where id = '00000000-0000-0000-0000-00000000c172') <> 'concluida' then raise exception 'FALHA: responsável não concluiu'; end if;
  if (select count(*) from public.responsaveis_possiveis('00000000-0000-0000-0000-00000000c172')) <> 2 then
    raise exception 'FALHA: deveria listar dono e P2 como possíveis responsáveis';
  end if;
  begin
    perform public.atualizar_tarefa('00000000-0000-0000-0000-00000000c172', 'Da apólice', null, '00000000-0000-0000-0000-00000000c1b1', null, null, 'media', 'a_fazer');
  exception when others then raise exception 'FALHA: responsável sem acesso ao registro não editou a própria tarefa: %', sqlerrm; end;
  begin
    perform public.atualizar_tarefa('00000000-0000-0000-0000-00000000c172', '  ', null, '00000000-0000-0000-0000-00000000c1b1', null, null, 'media', 'a_fazer');
    raise exception 'FALHA: aceitou título vazio';
  exception when check_violation then null; end;
end $$;

-- responsaveis_possiveis não vaza para quem não vê a tarefa
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000c1b2","role":"authenticated"}',true);
do $$ begin
  insert into public.tarefas (id, corretora_id, titulo, responsavel_usuario_id, criado_por) values
    ('00000000-0000-0000-0000-00000000c173','00000000-0000-0000-0000-00000000c1e1','Só minha','00000000-0000-0000-0000-00000000c1b2','00000000-0000-0000-0000-00000000c1b2');
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000c1b1","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.responsaveis_possiveis('00000000-0000-0000-0000-00000000c173')) <> 0 then raise exception 'FALHA: listou responsáveis de tarefa que não vê'; end if;
end $$;
reset role;
select 'TAREFAS EDICAO OK' as resultado;
rollback;
