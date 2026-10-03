-- Correções da revisão final do módulo de equipe.

-- C1: policies de SELECT olham as colunas da própria linha (insert ... returning funcionava antes da linha existir)
drop policy ve_contato_select on public.contatos;
create policy ve_contato_select on public.contatos for select to authenticated
  using (public.usuario_possui_corretora(corretora_id) and (
    public.escopo_usuario(corretora_id) = 'tudo'
    or criado_por_usuario_id = (select auth.uid())
    or exists (select 1 from public.apolices a where a.contato_id = contatos.id and public.usuario_ve_responsavel(contatos.corretora_id, a.responsavel_usuario_id))
    or exists (select 1 from public.negocios n where n.contato_id = contatos.id and public.usuario_ve_responsavel(contatos.corretora_id, n.vendedor_usuario_id))
  ));

drop policy ve_apolice_select on public.apolices;
create policy ve_apolice_select on public.apolices for select to authenticated
  using (public.usuario_possui_corretora(corretora_id) and public.usuario_ve_responsavel(corretora_id, responsavel_usuario_id));

drop policy ve_negocio_select on public.negocios;
create policy ve_negocio_select on public.negocios for select to authenticated
  using (exists (select 1 from public.etapas e join public.fluxos f on f.id = e.fluxo_id
    where e.id = etapa_id and public.usuario_possui_corretora(f.corretora_id) and public.usuario_ve_responsavel(f.corretora_id, vendedor_usuario_id)));

-- I4: índice usado pela visibilidade de contatos
create index if not exists negocios_contato_idx on public.negocios (contato_id);

-- C2: na conta, usuários só alteram nome e plano (dono e vagas extras ficam fora do alcance)
revoke update on public.contas from authenticated, anon;
grant update (nome, plano_id) on public.contas to authenticated;

-- I1: na linha de membro, só cargo e ativo
revoke update on public.usuario_corretora from authenticated, anon;
grant update (cargo_id, ativo) on public.usuario_corretora to authenticated;

-- I2: registros não mudam de corretora; criador do contato é fixo
create or replace function public.bloqueia_troca_corretora()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if new.corretora_id is distinct from old.corretora_id then
    raise exception 'Não é possível mover o registro para outra corretora.' using errcode = '42501';
  end if;
  if tg_table_name = 'contatos' and new.criado_por_usuario_id is distinct from old.criado_por_usuario_id then
    raise exception 'O criador do contato não pode ser alterado.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger apolices_bloqueia_troca_corretora before update of corretora_id on public.apolices
  for each row execute function public.bloqueia_troca_corretora();
create trigger contatos_bloqueia_troca_corretora before update of corretora_id, criado_por_usuario_id on public.contatos
  for each row execute function public.bloqueia_troca_corretora();

create or replace function public.negocios_bloqueia_troca_corretora()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or new.etapa_id = old.etapa_id then return new; end if;
  if (select f.corretora_id from public.etapas e join public.fluxos f on f.id = e.fluxo_id where e.id = new.etapa_id)
     is distinct from
     (select f.corretora_id from public.etapas e join public.fluxos f on f.id = e.fluxo_id where e.id = old.etapa_id) then
    raise exception 'Não é possível mover o negócio para outra corretora.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger negocios_bloqueia_troca_corretora before update of etapa_id on public.negocios
  for each row execute function public.negocios_bloqueia_troca_corretora();

-- C3: reativar membro respeita o limite do plano
create or replace function public.usuario_corretora_guarda()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_era_admin boolean; v_continua_admin boolean; v_dono uuid; v_uso record; v_conta uuid; v_email text;
begin
  select ct.owner_usuario_id, ct.id into v_dono, v_conta from public.corretoras c join public.contas ct on ct.id = c.conta_id where c.id = old.corretora_id;
  v_continua_admin := new.ativo and exists (select 1 from public.cargos where id = new.cargo_id and chave = 'administrador');
  if old.usuario_id = v_dono and not v_continua_admin then
    raise exception 'O dono da conta é sempre administrador e não pode ser desativado.';
  end if;
  v_era_admin := old.ativo and exists (select 1 from public.cargos where id = old.cargo_id and chave = 'administrador');
  if v_era_admin and not v_continua_admin and not exists (
       select 1 from public.usuario_corretora uc join public.cargos c on c.id = uc.cargo_id
       where uc.corretora_id = old.corretora_id and uc.usuario_id <> old.usuario_id and uc.ativo and c.chave = 'administrador') then
    raise exception 'A corretora precisa de pelo menos um administrador.';
  end if;

  if not old.ativo and new.ativo then
    select lower(email) into v_email from public.usuarios where id = new.usuario_id;
    select * into v_uso from public.uso_usuarios_conta(new.corretora_id);
    if v_uso.usados >= v_uso.limite
       -- já ocupa vaga: ativo em outra corretora da conta, ou com convite pendente (aceite reativa)
       and not exists (select 1 from public.usuario_corretora uc join public.corretoras c on c.id = uc.corretora_id
                       where c.conta_id = v_conta and uc.usuario_id = new.usuario_id and uc.ativo)
       and not exists (select 1 from public.convites cv join public.corretoras c on c.id = cv.corretora_id
                       where c.conta_id = v_conta and lower(cv.email) = v_email and cv.aceito_em is null and cv.cancelado_em is null and cv.expira_em > now()) then
      raise exception 'Seu plano % permite % usuários (% em uso). Mude de plano para reativar este membro.', v_uso.plano, v_uso.limite, v_uso.usados;
    end if;
  end if;
  return new;
end;
$$;

-- I3: aceitar convite exige e-mail confirmado
create or replace function public.aceitar_convite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_cv record; v_email text;
begin
  if (select auth.uid()) is null then raise exception 'Entre na sua conta para aceitar o convite.'; end if;
  select * into v_cv from public.convites where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if v_cv is null then raise exception 'Convite inválido.'; end if;
  if v_cv.aceito_em is not null then raise exception 'Este convite já foi usado.'; end if;
  if v_cv.cancelado_em is not null then raise exception 'Este convite foi cancelado. Peça um novo link.'; end if;
  if v_cv.expira_em <= now() then raise exception 'Este convite expirou. Peça um novo link.'; end if;
  select lower(email) into v_email from auth.users where id = (select auth.uid()) and email_confirmed_at is not null;
  if v_email is null then raise exception 'Confirme seu e-mail antes de aceitar o convite.'; end if;
  if v_email is distinct from lower(v_cv.email) then
    raise exception 'Este convite foi feito para outro e-mail (%). Entre com esse e-mail para aceitar.', v_cv.email;
  end if;
  insert into public.usuario_corretora (usuario_id, corretora_id, cargo_id)
  values ((select auth.uid()), v_cv.corretora_id, v_cv.cargo_id)
  on conflict (usuario_id, corretora_id) do update set ativo = true, cargo_id = excluded.cargo_id;
  update public.convites set aceito_em = now(), aceito_por = (select auth.uid()) where id = v_cv.id;
  return v_cv.corretora_id;
end;
$$;

revoke execute on function public.bloqueia_troca_corretora(), public.negocios_bloqueia_troca_corretora(), public.usuario_corretora_guarda() from public, anon, authenticated;
revoke execute on function public.aceitar_convite(text) from public, anon;
grant execute on function public.aceitar_convite(text) to authenticated;
