-- Notificações de tarefas: quem recebe, dedupe de menção, privacidade, lembretes idempotentes. Rodar com execute_sql; desfaz tudo.
begin;
insert into auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000b0a0','tn-dono@teste.local','authenticated','authenticated','{"nome":"Dono TN"}', now()),
  ('00000000-0000-0000-0000-00000000b0b1','tn-p1@teste.local','authenticated','authenticated','{"nome":"P1 TN"}', now()),
  ('00000000-0000-0000-0000-00000000b0b2','tn-p2@teste.local','authenticated','authenticated','{"nome":"P2 TN"}', now());
insert into public.contas (id, nome, plano_id, owner_usuario_id)
select '00000000-0000-0000-0000-00000000b0c9','Conta TN',(select id from public.planos where nome='Pro'),'00000000-0000-0000-0000-00000000b0a0';
insert into public.corretoras (id, conta_id, nome, onboarding_concluido) values ('00000000-0000-0000-0000-00000000b0e1','00000000-0000-0000-0000-00000000b0c9','TN',true);
insert into public.usuario_corretora (usuario_id, corretora_id, cargo_id)
select u, '00000000-0000-0000-0000-00000000b0e1', (select id from public.cargos where corretora_id='00000000-0000-0000-0000-00000000b0e1' and chave='produtor')
from unnest(array['00000000-0000-0000-0000-00000000b0b1'::uuid,'00000000-0000-0000-0000-00000000b0b2'::uuid]) u;

set local role authenticated;

-- Dono cria tarefa para P1 → P1 recebe "tarefa_atribuida"; dono não recebe nada
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000b0a0","role":"authenticated"}',true);
insert into public.tarefas (id, corretora_id, titulo, responsavel_usuario_id, criado_por) values
  ('00000000-0000-0000-0000-00000000b071','00000000-0000-0000-0000-00000000b0e1','Ligar para cliente','00000000-0000-0000-0000-00000000b0b1','00000000-0000-0000-0000-00000000b0a0');
insert into public.tarefas (id, corretora_id, titulo, responsavel_usuario_id, criado_por) values
  ('00000000-0000-0000-0000-00000000b074','00000000-0000-0000-0000-00000000b0e1','Minha própria','00000000-0000-0000-0000-00000000b0a0','00000000-0000-0000-0000-00000000b0a0');
do $$ begin
  if (select count(*) from public.notificacoes) <> 0 then raise exception 'FALHA: dono recebeu notificação da própria ação'; end if;
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000b0b1","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.notificacoes where tipo = 'tarefa_atribuida' and tarefa_id = '00000000-0000-0000-0000-00000000b071'
      and link = '/corretoras/00000000-0000-0000-0000-00000000b0e1/tarefas?tarefa=00000000-0000-0000-0000-00000000b071') <> 1 then
    raise exception 'FALHA: P1 não recebeu a atribuição com o link certo';
  end if;
  if (select count(*) from public.notificacoes where usuario_id <> '00000000-0000-0000-0000-00000000b0b1') <> 0 then raise exception 'FALHA: P1 vê notificação de outra pessoa'; end if;
  update public.notificacoes set lida_em = now();
  if not found then raise exception 'FALHA: P1 não marcou como lida'; end if;
  begin
    update public.notificacoes set titulo = 'hack';
    raise exception 'FALHA: P1 alterou o título da notificação';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.notificacoes (usuario_id, corretora_id, tipo, titulo, link) values
      ('00000000-0000-0000-0000-00000000b0b2','00000000-0000-0000-0000-00000000b0e1','mencao','spam','/');
    raise exception 'FALHA: usuário inseriu notificação direto';
  exception when insufficient_privilege then null; end;
  -- comentário na tarefa mencionando o dono (criador): uma notificação só, do tipo menção
  perform public.comentar('00000000-0000-0000-0000-00000000b0e1', 'Feito, @Dono TN', array['00000000-0000-0000-0000-00000000b0a0'::uuid], null, null, null, null, '00000000-0000-0000-0000-00000000b071');
  update public.tarefas set status = 'concluida' where id = '00000000-0000-0000-0000-00000000b071';
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000b0a0","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.notificacoes where tarefa_id = '00000000-0000-0000-0000-00000000b071' and tipo in ('mencao','comentario_tarefa')) <> 1 then
    raise exception 'FALHA: dono deveria ter exatamente 1 notificação pelo comentário (dedupe)';
  end if;
  if (select tipo from public.notificacoes where tarefa_id = '00000000-0000-0000-0000-00000000b071' and tipo in ('mencao','comentario_tarefa')) <> 'mencao' then
    raise exception 'FALHA: notificação do comentário deveria ser do tipo menção';
  end if;
  if (select count(*) from public.notificacoes where tipo = 'tarefa_concluida' and tarefa_id = '00000000-0000-0000-0000-00000000b071') <> 1 then
    raise exception 'FALHA: dono não soube da conclusão';
  end if;
  -- comentário sem menção na tarefa: responsável (P1) recebe comentario_tarefa
  perform public.comentar('00000000-0000-0000-0000-00000000b0e1', 'Obrigado!', '{}', null, null, null, null, '00000000-0000-0000-0000-00000000b071');
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000b0b1","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.notificacoes where tipo = 'comentario_tarefa') <> 1 then raise exception 'FALHA: responsável não recebeu o comentário da tarefa'; end if;
end $$;

-- Lembretes das 7h
reset role;
insert into public.tarefas (id, corretora_id, titulo, responsavel_usuario_id, criado_por, prazo, status) values
  ('00000000-0000-0000-0000-00000000b081','00000000-0000-0000-0000-00000000b0e1','Vence hoje','00000000-0000-0000-0000-00000000b0b2','00000000-0000-0000-0000-00000000b0a0','2026-10-10','a_fazer'),
  ('00000000-0000-0000-0000-00000000b082','00000000-0000-0000-0000-00000000b0e1','Atrasada','00000000-0000-0000-0000-00000000b0b2','00000000-0000-0000-0000-00000000b0a0','2026-10-08','em_andamento'),
  ('00000000-0000-0000-0000-00000000b083','00000000-0000-0000-0000-00000000b0e1','Concluída','00000000-0000-0000-0000-00000000b0b2','00000000-0000-0000-0000-00000000b0a0','2026-10-08','concluida'),
  ('00000000-0000-0000-0000-00000000b084','00000000-0000-0000-0000-00000000b0e1','Futura','00000000-0000-0000-0000-00000000b0b2','00000000-0000-0000-0000-00000000b0a0','2026-10-11','a_fazer'),
  ('00000000-0000-0000-0000-00000000b085','00000000-0000-0000-0000-00000000b0e1','De quem saiu','00000000-0000-0000-0000-00000000b0b1','00000000-0000-0000-0000-00000000b0a0','2026-10-01','a_fazer');
update public.usuario_corretora set ativo = false where usuario_id = '00000000-0000-0000-0000-00000000b0b1' and corretora_id = '00000000-0000-0000-0000-00000000b0e1';
select public.gerar_lembretes_tarefas('2026-10-10');
select public.gerar_lembretes_tarefas('2026-10-10');
do $$ begin
  if (select count(*) from public.notificacoes where usuario_id = '00000000-0000-0000-0000-00000000b0b2' and tipo = 'prazo_hoje') <> 1 then raise exception 'FALHA: prazo_hoje deveria ser 1'; end if;
  if (select count(*) from public.notificacoes where usuario_id = '00000000-0000-0000-0000-00000000b0b2' and tipo = 'tarefa_atrasada') <> 1 then raise exception 'FALHA: tarefa_atrasada deveria ser 1'; end if;
  if exists (select 1 from public.notificacoes where tarefa_id in ('00000000-0000-0000-0000-00000000b083','00000000-0000-0000-0000-00000000b084') and tipo in ('prazo_hoje','tarefa_atrasada')) then
    raise exception 'FALHA: lembrete para tarefa concluída ou futura';
  end if;
  if exists (select 1 from public.notificacoes where tarefa_id = '00000000-0000-0000-0000-00000000b085' and tipo in ('prazo_hoje','tarefa_atrasada')) then
    raise exception 'FALHA: lembrete para responsável desativado';
  end if;
  perform public.gerar_lembretes_tarefas('2026-10-11');
  if (select count(*) from public.notificacoes where tarefa_id = '00000000-0000-0000-0000-00000000b082' and tipo = 'tarefa_atrasada') <> 2 then
    raise exception 'FALHA: atrasada deveria lembrar de novo no dia seguinte';
  end if;
  if not exists (select 1 from cron.job where jobname = 'lembretes-tarefas' and schedule = '0 10 * * *') then raise exception 'FALHA: job das 7h não agendado'; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notificacoes') then raise exception 'FALHA: notificacoes fora do Realtime'; end if;
end $$;
select 'TAREFAS NOTIFICACOES OK' as resultado;
rollback;
