begin;
insert into auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000c0a0','cv-dono@teste.local','authenticated','authenticated','{"nome":"Dono"}', now()),
  ('00000000-0000-0000-0000-00000000c0b0','cv-novo@teste.local','authenticated','authenticated','{"nome":"Novo"}', now()),
  ('00000000-0000-0000-0000-00000000c0c0','cv-outro@teste.local','authenticated','authenticated','{"nome":"Outro"}', now());
insert into public.contas (id, nome, plano_id, owner_usuario_id)
select '00000000-0000-0000-0000-00000000cc00','Conta Starter',(select id from public.planos where nome='Starter'),'00000000-0000-0000-0000-00000000c0a0';
insert into public.corretoras (id, conta_id, nome, onboarding_concluido) values
  ('00000000-0000-0000-0000-00000000cc01','00000000-0000-0000-0000-00000000cc00','Matriz',true),
  ('00000000-0000-0000-0000-00000000cc02','00000000-0000-0000-0000-00000000cc00','Filial',true);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000c0a0","role":"authenticated"}',true);

do $$
declare t1 text; t2 text; v_uso record; v_perm json;
begin
  -- dono conta como 1 nas duas corretoras; Starter = 2
  select * into v_uso from public.uso_usuarios_conta('00000000-0000-0000-0000-00000000cc01');
  if v_uso.usados <> 1 or v_uso.limite <> 2 then raise exception 'FALHA: uso inicial esperado 1/2, veio %/%', v_uso.usados, v_uso.limite; end if;

  t1 := public.criar_convite('00000000-0000-0000-0000-00000000cc01', 'CV-Novo@teste.local',
        (select id from public.cargos where corretora_id = '00000000-0000-0000-0000-00000000cc01' and chave = 'produtor'));
  if length(t1) < 40 then raise exception 'FALHA: token curto'; end if;
  if exists (select 1 from public.convites where token_hash = t1) then raise exception 'FALHA: token guardado em claro'; end if;

  -- convite pendente conta: 2/2, novo convite recusado
  begin
    perform public.criar_convite('00000000-0000-0000-0000-00000000cc02', 'cv-outro@teste.local',
            (select id from public.cargos where corretora_id = '00000000-0000-0000-0000-00000000cc02' and chave = 'produtor'));
    raise exception 'FALHA: passou do limite do plano';
  exception when raise_exception then
    if sqlerrm not like '%permite 2 usuários%' then raise exception 'FALHA: mensagem de limite inesperada: %', sqlerrm; end if;
  end;

  -- convite duplicado para o mesmo e-mail
  begin
    perform public.criar_convite('00000000-0000-0000-0000-00000000cc01', 'cv-novo@teste.local',
            (select id from public.cargos where corretora_id = '00000000-0000-0000-0000-00000000cc01' and chave = 'produtor'));
    raise exception 'FALHA: aceitou convite duplicado';
  exception when raise_exception then
    if sqlerrm not like '%convite pendente%' and sqlerrm not like '%permite%' then raise exception 'FALHA: mensagem inesperada: %', sqlerrm; end if;
  end;

  -- regenerar troca o token
  t2 := public.regenerar_convite((select id from public.convites where lower(email) = 'cv-novo@teste.local'));
  if t2 = t1 then raise exception 'FALHA: regenerar não trocou o token'; end if;
  if (select situacao from public.info_convite(t1)) <> 'invalido' then raise exception 'FALHA: token antigo ainda vale'; end if;
  if (select situacao from public.info_convite(t2)) <> 'pendente' then raise exception 'FALHA: token novo não está pendente'; end if;

  -- não pode desativar o dono
  begin
    update public.usuario_corretora set ativo = false where usuario_id = '00000000-0000-0000-0000-00000000c0a0' and corretora_id = '00000000-0000-0000-0000-00000000cc01';
    raise exception 'FALHA: desativou o dono';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  v_perm := public.minhas_permissoes('00000000-0000-0000-0000-00000000cc01');
  if (v_perm->>'cargo_chave') <> 'administrador' or (v_perm->>'dono')::boolean is not true then raise exception 'FALHA: minhas_permissoes do dono: %', v_perm; end if;

  perform set_config('test.t2', t2, true);
end $$;

-- outro e-mail não aceita
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000c0c0","role":"authenticated"}',true);
do $$ begin
  begin
    perform public.aceitar_convite(current_setting('test.t2'));
    raise exception 'FALHA: aceitou convite de outro e-mail';
  exception when raise_exception then
    if sqlerrm not like '%outro e-mail%' then raise exception 'FALHA: mensagem inesperada: %', sqlerrm; end if;
  end;
end $$;

-- e-mail certo aceita, vira produtor; uso continua 2 (pendente virou membro)
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000c0b0","role":"authenticated"}',true);
do $$
declare v_corr uuid; v_uso record;
begin
  v_corr := public.aceitar_convite(current_setting('test.t2'));
  if v_corr <> '00000000-0000-0000-0000-00000000cc01' then raise exception 'FALHA: corretora errada no aceite'; end if;
  if (public.minhas_permissoes(v_corr)->>'cargo_chave') <> 'produtor' then raise exception 'FALHA: não virou produtor'; end if;
  select * into v_uso from public.uso_usuarios_conta(v_corr);
  if v_uso.usados <> 2 then raise exception 'FALHA: uso após aceite deveria ser 2, veio %', v_uso.usados; end if;
  begin
    perform public.aceitar_convite(current_setting('test.t2'));
    raise exception 'FALHA: aceitou duas vezes';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;

-- renovação: apólice do produtor gera negócio para ele; transferir carteira move
reset role;
insert into public.fluxos (id, corretora_id, nome, ativo) values ('00000000-0000-0000-0000-00000000cf01','00000000-0000-0000-0000-00000000cc01','F',true);
insert into public.etapas (id, fluxo_id, nome, ordem, renovacao) values ('00000000-0000-0000-0000-00000000cf11','00000000-0000-0000-0000-00000000cf01','Renovações',0,true);
insert into public.contatos (id, corretora_id, nome, tipo_pessoa, criado_por_usuario_id) values ('00000000-0000-0000-0000-00000000cd01','00000000-0000-0000-0000-00000000cc01','Cli','fisica','00000000-0000-0000-0000-00000000c0b0');
insert into public.apolices (id, corretora_id, contato_id, seguradora_id, ramo, numero, inicio_vigencia, fim_vigencia, forma_pagamento, responsavel_usuario_id)
values ('00000000-0000-0000-0000-00000000ca01','00000000-0000-0000-0000-00000000cc01','00000000-0000-0000-0000-00000000cd01',(select id from public.seguradoras order by nome limit 1),'Automóvel','CV-1','2025-11-15','2026-11-15','boleto','00000000-0000-0000-0000-00000000c0b0');
do $$ begin
  perform public.criar_negocios_renovacao('2026-10-02');
  if (select vendedor_usuario_id from public.negocios where apolice_renovada_id = '00000000-0000-0000-0000-00000000ca01') <> '00000000-0000-0000-0000-00000000c0b0' then
    raise exception 'FALHA: renovação não foi para o responsável da apólice'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000c0a0","role":"authenticated"}',true);
do $$ declare n int; begin
  n := public.transferir_carteira('00000000-0000-0000-0000-00000000cc01','00000000-0000-0000-0000-00000000c0b0','00000000-0000-0000-0000-00000000c0a0');
  if n < 2 then raise exception 'FALHA: transferência deveria mover apólice e negócio (moveu %)', n; end if;
  if (select responsavel_usuario_id from public.apolices where id = '00000000-0000-0000-0000-00000000ca01') <> '00000000-0000-0000-0000-00000000c0a0' then
    raise exception 'FALHA: apólice não transferida'; end if;
end $$;

-- produtor não transfere
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000c0b0","role":"authenticated"}',true);
do $$ begin
  begin
    perform public.transferir_carteira('00000000-0000-0000-0000-00000000cc01','00000000-0000-0000-0000-00000000c0a0','00000000-0000-0000-0000-00000000c0b0');
    raise exception 'FALHA: produtor transferiu carteira';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'EQUIPE CONVITES OK' as resultado;
rollback;
