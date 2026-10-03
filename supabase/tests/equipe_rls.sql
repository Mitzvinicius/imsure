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

-- (checagens da Task 3 entram aqui)

select 'EQUIPE RLS OK' as resultado;
rollback;
