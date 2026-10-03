-- Matriz de visibilidade da equipe. Roda numa transação e desfaz tudo.
begin;

-- usuários: A dono/admin, G gerente, F financeiro, O operacional, P1/P2 produtores, L produtor líder de P2
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000e0a0','eq-a@teste.local','authenticated','authenticated','{"nome":"Admin"}'),
  ('00000000-0000-0000-0000-00000000e0b0','eq-g@teste.local','authenticated','authenticated','{"nome":"Gerente"}'),
  ('00000000-0000-0000-0000-00000000e0c0','eq-f@teste.local','authenticated','authenticated','{"nome":"Financeiro"}'),
  ('00000000-0000-0000-0000-00000000e0d0','eq-o@teste.local','authenticated','authenticated','{"nome":"Operacional"}'),
  ('00000000-0000-0000-0000-00000000e0e1','eq-p1@teste.local','authenticated','authenticated','{"nome":"Produtor 1"}'),
  ('00000000-0000-0000-0000-00000000e0e2','eq-p2@teste.local','authenticated','authenticated','{"nome":"Produtor 2"}'),
  ('00000000-0000-0000-0000-00000000e0f0','eq-l@teste.local','authenticated','authenticated','{"nome":"Lider"}');

insert into public.contas (id, nome, plano_id, owner_usuario_id)
select '00000000-0000-0000-0000-00000000ec00','Conta Eq',(select id from public.planos where nome='Business'),'00000000-0000-0000-0000-00000000e0a0';
insert into public.corretoras (id, conta_id, nome, onboarding_concluido)
values ('00000000-0000-0000-0000-00000000ec01','00000000-0000-0000-0000-00000000ec00','Corretora Eq',true);

do $$ begin
  if (select count(*) from public.cargos where corretora_id = '00000000-0000-0000-0000-00000000ec01') <> 5 then
    raise exception 'FALHA: corretora nova não ganhou os 5 cargos padrão'; end if;
  if not exists (select 1 from public.usuario_corretora uc join public.cargos c on c.id = uc.cargo_id
                 where uc.corretora_id = '00000000-0000-0000-0000-00000000ec01' and uc.usuario_id = '00000000-0000-0000-0000-00000000e0a0' and c.chave = 'administrador') then
    raise exception 'FALHA: dono não virou administrador da corretora nova'; end if;
  if (select count(*) from public.cargo_permissoes cp join public.cargos c on c.id = cp.cargo_id
      where c.corretora_id = '00000000-0000-0000-0000-00000000ec01' and c.chave = 'gerente') <> 7 then
    raise exception 'FALHA: gerente deveria ter 7 permissões'; end if;
end $$;

insert into public.usuario_corretora (usuario_id, corretora_id, cargo_id)
select u.id, '00000000-0000-0000-0000-00000000ec01', (select id from public.cargos where corretora_id = '00000000-0000-0000-0000-00000000ec01' and chave = u.chave)
from (values
  ('00000000-0000-0000-0000-00000000e0b0'::uuid,'gerente'),
  ('00000000-0000-0000-0000-00000000e0c0'::uuid,'financeiro'),
  ('00000000-0000-0000-0000-00000000e0d0'::uuid,'operacional'),
  ('00000000-0000-0000-0000-00000000e0e1'::uuid,'produtor'),
  ('00000000-0000-0000-0000-00000000e0e2'::uuid,'produtor'),
  ('00000000-0000-0000-0000-00000000e0f0'::uuid,'produtor')) as u(id, chave);

insert into public.equipes (id, corretora_id, nome, ramos) values ('00000000-0000-0000-0000-00000000ee01','00000000-0000-0000-0000-00000000ec01','Vida',array['Vida Individual']);
insert into public.equipe_membros (equipe_id, usuario_id, lider) values
  ('00000000-0000-0000-0000-00000000ee01','00000000-0000-0000-0000-00000000e0f0',true),
  ('00000000-0000-0000-0000-00000000ee01','00000000-0000-0000-0000-00000000e0e2',false);

-- dados: fluxo, contatos, negócios, apólices (P1: C1 auto; P2: C2 auto e C1 vida), saúde e parcela
insert into public.fluxos (id, corretora_id, nome, ativo) values ('00000000-0000-0000-0000-00000000ef01','00000000-0000-0000-0000-00000000ec01','Funil',true);
insert into public.etapas (id, fluxo_id, nome, ordem) values ('00000000-0000-0000-0000-00000000ef11','00000000-0000-0000-0000-00000000ef01','Novo',0);
insert into public.contatos (id, corretora_id, nome, tipo_pessoa, criado_por_usuario_id) values
  ('00000000-0000-0000-0000-00000000ed01','00000000-0000-0000-0000-00000000ec01','Cliente 1','fisica','00000000-0000-0000-0000-00000000e0e1'),
  ('00000000-0000-0000-0000-00000000ed02','00000000-0000-0000-0000-00000000ec01','Cliente 2','fisica','00000000-0000-0000-0000-00000000e0e2');
insert into public.negocios (id, etapa_id, contato_id, vendedor_usuario_id, tipo, ramo) values
  ('00000000-0000-0000-0000-00000000eb01','00000000-0000-0000-0000-00000000ef11','00000000-0000-0000-0000-00000000ed01','00000000-0000-0000-0000-00000000e0e1','Seguro novo','Automóvel'),
  ('00000000-0000-0000-0000-00000000eb02','00000000-0000-0000-0000-00000000ef11','00000000-0000-0000-0000-00000000ed02','00000000-0000-0000-0000-00000000e0e2','Seguro novo','Automóvel');
insert into public.apolices (id, corretora_id, contato_id, seguradora_id, ramo, numero, inicio_vigencia, fim_vigencia, forma_pagamento, responsavel_usuario_id) values
  ('00000000-0000-0000-0000-00000000ea01','00000000-0000-0000-0000-00000000ec01','00000000-0000-0000-0000-00000000ed01',(select id from public.seguradoras order by nome limit 1),'Automóvel','EQ-1','2026-01-01','2027-01-01','boleto','00000000-0000-0000-0000-00000000e0e1'),
  ('00000000-0000-0000-0000-00000000ea02','00000000-0000-0000-0000-00000000ec01','00000000-0000-0000-0000-00000000ed02',(select id from public.seguradoras order by nome limit 1),'Automóvel','EQ-2','2026-01-01','2027-01-01','boleto','00000000-0000-0000-0000-00000000e0e2'),
  ('00000000-0000-0000-0000-00000000ea03','00000000-0000-0000-0000-00000000ec01','00000000-0000-0000-0000-00000000ed01',(select id from public.seguradoras order by nome limit 1),'Vida Individual','EQ-3','2026-01-01','2027-01-01','boleto','00000000-0000-0000-0000-00000000e0e2');
insert into public.parcelas (id, apolice_id, numero, vencimento, valor) values ('00000000-0000-0000-0000-00000000ea91','00000000-0000-0000-0000-00000000ea01',1,'2026-02-01',100);
insert into public.contato_saude (contato_id, corretora_id, peso_kg) values ('00000000-0000-0000-0000-00000000ed01','00000000-0000-0000-0000-00000000ec01',70);

set local role authenticated;

-- Produtor 1: só a própria carteira
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000e0e1","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.apolices) <> 1 then raise exception 'FALHA: P1 deveria ver só EQ-1 (viu %)', (select count(*) from public.apolices); end if;
  if (select count(*) from public.negocios) <> 1 then raise exception 'FALHA: P1 deveria ver só o próprio negócio'; end if;
  if (select count(*) from public.contatos) <> 1 then raise exception 'FALHA: P1 deveria ver só Cliente 1'; end if;
  if (select count(*) from public.contato_saude) <> 1 then raise exception 'FALHA: P1 deveria ver a saúde do próprio cliente'; end if;
  if (select count(*) from public.usuarios) < 7 then raise exception 'FALHA: P1 deveria ver os colegas da corretora'; end if;
  begin
    update public.negocios set vendedor_usuario_id = '00000000-0000-0000-0000-00000000e0e2' where id = '00000000-0000-0000-0000-00000000eb01';
    raise exception 'FALHA: P1 transferiu negócio sem permissão';
  exception when insufficient_privilege then null; end;
  begin
    update public.parcelas set status = 'paga' where id = '00000000-0000-0000-0000-00000000ea91';
    raise exception 'FALHA: P1 deu baixa sem permissão';
  exception when insufficient_privilege then null; end;
  update public.corretoras set nome = 'Hack' where id = '00000000-0000-0000-0000-00000000ec01';
  if found then raise exception 'FALHA: P1 editou a corretora'; end if;
end $$;

-- Produtor 2: vê Cliente 1 (tem a vida dele) mas não a apólice auto de P1
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000e0e2","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.apolices) <> 2 then raise exception 'FALHA: P2 deveria ver EQ-2 e EQ-3'; end if;
  if (select count(*) from public.contatos) <> 2 then raise exception 'FALHA: P2 deveria ver Cliente 1 e 2'; end if;
  if exists (select 1 from public.apolices where id = '00000000-0000-0000-0000-00000000ea01') then raise exception 'FALHA: P2 vê apólice de P1 por id'; end if;
end $$;

-- Líder: vê a carteira de P2 (equipe) e não a de P1
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000e0f0","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.apolices) <> 2 then raise exception 'FALHA: líder deveria ver as 2 apólices de P2'; end if;
  if exists (select 1 from public.apolices where id = '00000000-0000-0000-0000-00000000ea01') then raise exception 'FALHA: líder vê apólice de fora da equipe'; end if;
end $$;

-- Gerente: tudo, menos saúde; não edita configurações
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000e0b0","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.apolices) <> 3 then raise exception 'FALHA: gerente deveria ver as 3 apólices'; end if;
  if (select count(*) from public.contato_saude) <> 0 then raise exception 'FALHA: gerente vê saúde'; end if;
  update public.corretoras set nome = 'Hack' where id = '00000000-0000-0000-0000-00000000ec01';
  if found then raise exception 'FALHA: gerente editou configurações'; end if;
  update public.negocios set vendedor_usuario_id = '00000000-0000-0000-0000-00000000e0e2' where id = '00000000-0000-0000-0000-00000000eb01';
  if not found then raise exception 'FALHA: gerente não conseguiu transferir'; end if;
end $$;

-- Financeiro: edita configurações, dá baixa, não exclui apólice, não vê saúde
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000e0c0","role":"authenticated"}',true);
do $$ begin
  update public.corretoras set nome = 'Corretora Eq 2' where id = '00000000-0000-0000-0000-00000000ec01';
  if not found then raise exception 'FALHA: financeiro não editou configurações'; end if;
  update public.parcelas set status = 'paga' where id = '00000000-0000-0000-0000-00000000ea91';
  if not found then raise exception 'FALHA: financeiro não deu baixa'; end if;
  delete from public.apolices where id = '00000000-0000-0000-0000-00000000ea02';
  if found then raise exception 'FALHA: financeiro excluiu apólice'; end if;
  if (select count(*) from public.contato_saude) <> 0 then raise exception 'FALHA: financeiro vê saúde'; end if;
end $$;

-- Operacional: vê saúde, não exclui
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000e0d0","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.contato_saude) <> 1 then raise exception 'FALHA: operacional não vê saúde'; end if;
  delete from public.negocios where id = '00000000-0000-0000-0000-00000000eb02';
  if found then raise exception 'FALHA: operacional excluiu negócio'; end if;
end $$;

-- Admin desativa P1 → P1 perde tudo
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000e0a0","role":"authenticated"}',true);
update public.usuario_corretora set ativo = false where usuario_id = '00000000-0000-0000-0000-00000000e0e1';
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000e0e1","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.apolices) + (select count(*) from public.contatos) + (select count(*) from public.negocios) <> 0 then
    raise exception 'FALHA: desativado continua vendo dados'; end if;
end $$;

reset role;

select 'EQUIPE RLS OK' as resultado;
rollback;
