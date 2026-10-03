-- Contatos visíveis para toda a corretora; ficha sensível e edição completa só na carteira.
begin;
insert into auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000009a0','cc-dono@teste.local','authenticated','authenticated','{"nome":"Dono"}', now()),
  ('00000000-0000-0000-0000-0000000009b1','cc-p1@teste.local','authenticated','authenticated','{"nome":"P1"}', now()),
  ('00000000-0000-0000-0000-0000000009b2','cc-p2@teste.local','authenticated','authenticated','{"nome":"P2"}', now()),
  ('00000000-0000-0000-0000-0000000009c0','cc-fora@teste.local','authenticated','authenticated','{"nome":"Fora"}', now());
insert into public.contas (id, nome, plano_id, owner_usuario_id)
select '00000000-0000-0000-0000-0000000009c9','Conta CC',(select id from public.planos where nome='Pro'),'00000000-0000-0000-0000-0000000009a0';
insert into public.corretoras (id, conta_id, nome, onboarding_concluido) values ('00000000-0000-0000-0000-0000000009e1','00000000-0000-0000-0000-0000000009c9','CC',true);
insert into public.usuario_corretora (usuario_id, corretora_id, cargo_id)
select u, '00000000-0000-0000-0000-0000000009e1', (select id from public.cargos where corretora_id='00000000-0000-0000-0000-0000000009e1' and chave='produtor')
from unnest(array['00000000-0000-0000-0000-0000000009b1'::uuid,'00000000-0000-0000-0000-0000000009b2'::uuid]) u;
insert into public.contatos (id, corretora_id, nome, tipo_pessoa, telefone, criado_por_usuario_id) values
  ('00000000-0000-0000-0000-0000000009d2','00000000-0000-0000-0000-0000000009e1','Cliente de P2','fisica','(11) 90000-0000','00000000-0000-0000-0000-0000000009b2');
insert into public.contato_financeiro (contato_id, corretora_id, renda_mensal) values ('00000000-0000-0000-0000-0000000009d2','00000000-0000-0000-0000-0000000009e1',15000);
insert into public.contato_saude (contato_id, corretora_id, peso_kg) values ('00000000-0000-0000-0000-0000000009d2','00000000-0000-0000-0000-0000000009e1',80);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000009b1","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.contatos where id = '00000000-0000-0000-0000-0000000009d2') <> 1 then raise exception 'FALHA: P1 não vê contato do colega'; end if;
  if public.usuario_ve_contato('00000000-0000-0000-0000-0000000009d2') then raise exception 'FALHA: contato do colega não deveria estar na carteira de P1'; end if;
  if (select count(*) from public.contato_financeiro) <> 0 then raise exception 'FALHA: P1 vê financeiro de cliente do colega'; end if;
  if (select count(*) from public.contato_saude) <> 0 then raise exception 'FALHA: P1 vê saúde de cliente do colega'; end if;
  update public.contatos set telefone = '(11) 91111-1111', email = 'novo@cliente.com' where id = '00000000-0000-0000-0000-0000000009d2';
  if not found then raise exception 'FALHA: P1 não conseguiu corrigir telefone/e-mail'; end if;
  begin
    update public.contatos set nome = 'Hack' where id = '00000000-0000-0000-0000-0000000009d2';
    raise exception 'FALHA: P1 editou nome de cliente do colega';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000009b2","role":"authenticated"}',true);
do $$ begin
  if (select renda_mensal from public.contato_financeiro where contato_id = '00000000-0000-0000-0000-0000000009d2') <> 15000 then raise exception 'FALHA: P2 não vê o próprio financeiro'; end if;
  update public.contatos set nome = 'Cliente de P2 (editado)' where id = '00000000-0000-0000-0000-0000000009d2';
  if not found then raise exception 'FALHA: P2 não editou o próprio contato'; end if;
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000009c0","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.contatos where id = '00000000-0000-0000-0000-0000000009d2') <> 0 then raise exception 'FALHA: usuário de fora vê contato da corretora'; end if;
end $$;
reset role;
select 'CONTATOS COMPARTILHADOS OK' as resultado;
rollback;
