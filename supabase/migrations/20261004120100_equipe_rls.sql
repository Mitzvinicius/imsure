-- ===== Funções de visibilidade por registro =====
create or replace function public.usuario_ve_negocio(p_negocio_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.negocios n
    join public.etapas e on e.id = n.etapa_id
    join public.fluxos f on f.id = e.fluxo_id
    where n.id = p_negocio_id
      and public.usuario_possui_corretora(f.corretora_id)
      and public.usuario_ve_responsavel(f.corretora_id, n.vendedor_usuario_id)
  );
$$;

create or replace function public.usuario_possui_apolice(p_apolice_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.apolices a
    where a.id = p_apolice_id
      and public.usuario_possui_corretora(a.corretora_id)
      and public.usuario_ve_responsavel(a.corretora_id, a.responsavel_usuario_id)
  );
$$;

create or replace function public.usuario_ve_contato(p_contato_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.contatos c
    where c.id = p_contato_id
      and public.usuario_possui_corretora(c.corretora_id)
      and (
        public.escopo_usuario(c.corretora_id) = 'tudo'
        or c.criado_por_usuario_id = (select auth.uid())
        or exists (select 1 from public.apolices a where a.contato_id = c.id and public.usuario_ve_responsavel(c.corretora_id, a.responsavel_usuario_id))
        or exists (select 1 from public.negocios n where n.contato_id = c.id and public.usuario_ve_responsavel(c.corretora_id, n.vendedor_usuario_id))
      )
  );
$$;

revoke execute on function public.usuario_ve_negocio(uuid), public.usuario_possui_apolice(uuid), public.usuario_ve_contato(uuid) from public, anon;
grant execute on function public.usuario_ve_negocio(uuid), public.usuario_possui_apolice(uuid), public.usuario_ve_contato(uuid) to authenticated;

-- ===== Conta e corretora =====
-- Funções definer evitam recursão entre as policies de contas e corretoras (aplicado como equipe_rls_conta_sem_recursao)
create or replace function public.usuario_e_dono_conta(p_conta_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.contas where id = p_conta_id and owner_usuario_id = (select auth.uid()));
$$;

create or replace function public.usuario_membro_conta(p_conta_id uuid, p_permissao text default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.corretoras c
    where c.conta_id = p_conta_id
      and (case when p_permissao is null then public.usuario_possui_corretora(c.id) else public.usuario_pode(c.id, p_permissao) end)
  );
$$;

revoke execute on function public.usuario_e_dono_conta(uuid), public.usuario_membro_conta(uuid, text) from public, anon;
grant execute on function public.usuario_e_dono_conta(uuid), public.usuario_membro_conta(uuid, text) to authenticated;

drop policy owner_pode_ver_sua_conta on public.contas;
create policy membro_ve_conta on public.contas for select to authenticated
  using (owner_usuario_id = (select auth.uid()) or public.usuario_membro_conta(id));
create policy gestor_altera_conta on public.contas for update to authenticated
  using (owner_usuario_id = (select auth.uid()) or public.usuario_membro_conta(id, 'plano.gerenciar'))
  with check (owner_usuario_id = (select auth.uid()) or public.usuario_membro_conta(id, 'plano.gerenciar'));

drop policy owner_pode_ver_suas_corretoras on public.corretoras;
drop policy owner_pode_atualizar_sua_corretora on public.corretoras;
create policy membro_ve_corretora on public.corretoras for select to authenticated
  using (public.usuario_possui_corretora(id) or public.usuario_e_dono_conta(conta_id));
create policy gestor_altera_corretora on public.corretoras for update to authenticated
  using (public.usuario_pode(id, 'configuracoes.editar'))
  with check (public.usuario_pode(id, 'configuracoes.editar'));
-- owner_pode_criar_corretora (insert) continua igual

-- ===== Funis =====
drop policy owner_pode_gerenciar_fluxos on public.fluxos;
create policy membro_le_fluxos on public.fluxos for select to authenticated using (public.usuario_possui_corretora(corretora_id));
create policy gestor_gerencia_fluxos on public.fluxos for all to authenticated
  using (public.usuario_pode(corretora_id, 'configuracoes.editar'))
  with check (public.usuario_pode(corretora_id, 'configuracoes.editar'));

drop policy owner_pode_gerenciar_etapas on public.etapas;
create policy membro_le_etapas on public.etapas for select to authenticated
  using (exists (select 1 from public.fluxos f where f.id = fluxo_id and public.usuario_possui_corretora(f.corretora_id)));
create policy gestor_gerencia_etapas on public.etapas for all to authenticated
  using (exists (select 1 from public.fluxos f where f.id = fluxo_id and public.usuario_pode(f.corretora_id, 'configuracoes.editar')))
  with check (exists (select 1 from public.fluxos f where f.id = fluxo_id and public.usuario_pode(f.corretora_id, 'configuracoes.editar')));

-- ===== Contatos =====
drop policy owner_pode_gerenciar_contatos on public.contatos;
create policy ve_contato_select on public.contatos for select to authenticated using (public.usuario_ve_contato(id));
create policy membro_cria_contato on public.contatos for insert to authenticated
  with check (public.usuario_possui_corretora(corretora_id) and criado_por_usuario_id = (select auth.uid()));
create policy ve_contato_update on public.contatos for update to authenticated
  using (public.usuario_ve_contato(id)) with check (public.usuario_possui_corretora(corretora_id));
create policy ve_contato_delete on public.contatos for delete to authenticated
  using (public.usuario_ve_contato(id) and public.escopo_usuario(corretora_id) = 'tudo');

drop policy owner_pode_gerenciar_contato_vinculos on public.contato_vinculos;
create policy ve_contato_vinculos on public.contato_vinculos for all to authenticated
  using (public.usuario_ve_contato(contato_id) or public.usuario_ve_contato(parente_id))
  with check (public.usuario_ve_contato(contato_id) and public.usuario_ve_contato(parente_id));

drop policy owner_pode_gerenciar_contato_bens on public.contato_bens;
create policy ve_contato_bens on public.contato_bens for all to authenticated
  using (public.usuario_ve_contato(contato_id) and public.usuario_pode(corretora_id, 'contatos.financeiro.ver'))
  with check (public.usuario_ve_contato(contato_id) and public.usuario_pode(corretora_id, 'contatos.financeiro.ver'));

drop policy owner_pode_gerenciar_contato_bem_apolices on public.contato_bem_apolices;
create policy ve_contato_bem_apolices on public.contato_bem_apolices for all to authenticated
  using (public.usuario_ve_contato(contato_id) and public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_ve_contato(contato_id) and public.usuario_possui_apolice(apolice_id));

drop policy owner_pode_gerenciar_contato_saude on public.contato_saude;
create policy ve_contato_saude on public.contato_saude for all to authenticated
  using (public.usuario_ve_contato(contato_id) and public.usuario_pode(corretora_id, 'contatos.saude.ver'))
  with check (public.usuario_ve_contato(contato_id) and public.usuario_pode(corretora_id, 'contatos.saude.ver'));

-- ===== Negócios =====
drop policy owner_pode_gerenciar_negocios on public.negocios;
create policy ve_negocio_select on public.negocios for select to authenticated using (public.usuario_ve_negocio(id));
create policy membro_cria_negocio on public.negocios for insert to authenticated
  with check (exists (select 1 from public.etapas e join public.fluxos f on f.id = e.fluxo_id
    where e.id = etapa_id and public.usuario_possui_corretora(f.corretora_id) and public.usuario_ve_responsavel(f.corretora_id, vendedor_usuario_id)));
create policy ve_negocio_update on public.negocios for update to authenticated
  using (public.usuario_ve_negocio(id))
  with check (exists (select 1 from public.etapas e join public.fluxos f on f.id = e.fluxo_id
    where e.id = etapa_id and public.usuario_possui_corretora(f.corretora_id)));
create policy pode_excluir_negocio on public.negocios for delete to authenticated
  using (public.usuario_ve_negocio(id) and exists (select 1 from public.etapas e join public.fluxos f on f.id = e.fluxo_id
    where e.id = etapa_id and public.usuario_pode(f.corretora_id, 'negocios.excluir')));

drop policy owner_pode_gerenciar_negocio_anexos on public.negocio_anexos;
create policy ve_negocio_anexos on public.negocio_anexos for all to authenticated
  using (public.usuario_ve_negocio(negocio_id)) with check (public.usuario_ve_negocio(negocio_id));
drop policy owner_pode_gerenciar_negocio_anotacoes on public.negocio_anotacoes;
create policy ve_negocio_anotacoes on public.negocio_anotacoes for all to authenticated
  using (public.usuario_ve_negocio(negocio_id)) with check (public.usuario_ve_negocio(negocio_id));
drop policy owner_pode_inserir_negocio_historico on public.negocio_historico;
drop policy owner_pode_ver_negocio_historico on public.negocio_historico;
create policy ve_negocio_historico_select on public.negocio_historico for select to authenticated using (public.usuario_ve_negocio(negocio_id));
create policy ve_negocio_historico_insert on public.negocio_historico for insert to authenticated with check (public.usuario_ve_negocio(negocio_id));

drop policy owner_pode_gerenciar_storage_negocio_anexos on storage.objects;
create policy ve_storage_negocio_anexos on storage.objects for all to authenticated
  using (bucket_id = 'negocio-anexos' and exists (select 1 from public.negocios n where n.id::text = (storage.foldername(name))[1] and public.usuario_ve_negocio(n.id)))
  with check (bucket_id = 'negocio-anexos' and exists (select 1 from public.negocios n where n.id::text = (storage.foldername(name))[1] and public.usuario_ve_negocio(n.id)));

drop policy owner_pode_gerenciar_storage_apolice_anexos on storage.objects;
create policy ve_storage_apolice_anexos on storage.objects for all to authenticated
  using (bucket_id = 'apolice-anexos' and exists (select 1 from public.apolices a where a.id::text = (storage.foldername(name))[1] and public.usuario_possui_apolice(a.id)))
  with check (bucket_id = 'apolice-anexos' and exists (select 1 from public.apolices a where a.id::text = (storage.foldername(name))[1] and public.usuario_possui_apolice(a.id)));

-- ===== Usuários: colegas das mesmas corretoras =====
drop policy ver_vendedor_de_negocios_que_possuo on public.usuarios;
create policy ve_colegas on public.usuarios for select to authenticated
  using (id = (select auth.uid()) or exists (
    select 1 from public.usuario_corretora eu join public.usuario_corretora outro on outro.corretora_id = eu.corretora_id
    where eu.usuario_id = (select auth.uid()) and eu.ativo and outro.usuario_id = usuarios.id));

-- ===== Apólices e sinistros: exclusão exige permissão =====
drop policy owner_pode_gerenciar_apolices on public.apolices;
create policy ve_apolice_select on public.apolices for select to authenticated using (public.usuario_possui_apolice(id));
create policy membro_cria_apolice on public.apolices for insert to authenticated
  with check (public.usuario_possui_corretora(corretora_id) and public.usuario_ve_responsavel(corretora_id, responsavel_usuario_id));
create policy ve_apolice_update on public.apolices for update to authenticated
  using (public.usuario_possui_apolice(id)) with check (public.usuario_possui_corretora(corretora_id));
create policy pode_excluir_apolice on public.apolices for delete to authenticated
  using (public.usuario_possui_apolice(id) and public.usuario_pode(corretora_id, 'apolices.excluir'));

drop policy owner_pode_gerenciar_sinistros on public.sinistros;
create policy ve_sinistro_select on public.sinistros for select to authenticated using (public.usuario_possui_apolice(apolice_id));
create policy ve_sinistro_insert on public.sinistros for insert to authenticated with check (public.usuario_possui_apolice(apolice_id));
create policy ve_sinistro_update on public.sinistros for update to authenticated using (public.usuario_possui_apolice(apolice_id)) with check (public.usuario_possui_apolice(apolice_id));
create policy pode_excluir_sinistro on public.sinistros for delete to authenticated
  using (public.usuario_possui_apolice(apolice_id) and exists (select 1 from public.apolices a where a.id = apolice_id and public.usuario_pode(a.corretora_id, 'sinistros.excluir')));

-- ===== Triggers: troca de responsável e baixa =====
create or replace function public.negocios_checa_vendedor()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_corretora uuid;
begin
  if (select auth.uid()) is null then return new; end if;
  if tg_op = 'UPDATE' and new.vendedor_usuario_id is not distinct from old.vendedor_usuario_id then return new; end if;
  if tg_op = 'INSERT' and new.vendedor_usuario_id = (select auth.uid()) then return new; end if;
  select f.corretora_id into v_corretora from public.etapas e join public.fluxos f on f.id = e.fluxo_id where e.id = new.etapa_id;
  if not public.usuario_pode(v_corretora, 'carteira.transferir') then
    raise exception 'Você não tem permissão para trocar o responsável do negócio.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger negocios_checa_vendedor before insert or update of vendedor_usuario_id on public.negocios
  for each row execute function public.negocios_checa_vendedor();

create or replace function public.apolices_checa_responsavel()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if tg_op = 'UPDATE' and new.responsavel_usuario_id is not distinct from old.responsavel_usuario_id then return new; end if;
  if tg_op = 'INSERT' and new.responsavel_usuario_id = (select auth.uid()) then return new; end if;
  if tg_op = 'INSERT' and new.negocio_origem_id is not null
     and new.responsavel_usuario_id = (select n.vendedor_usuario_id from public.negocios n where n.id = new.negocio_origem_id) then return new; end if;
  if not public.usuario_pode(new.corretora_id, 'carteira.transferir') then
    raise exception 'Você não tem permissão para trocar o responsável da apólice.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger apolices_checa_responsavel before insert or update of responsavel_usuario_id on public.apolices
  for each row execute function public.apolices_checa_responsavel();

create or replace function public.parcelas_checa_baixa()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or new.status is not distinct from old.status then return new; end if;
  if not public.usuario_pode((select a.corretora_id from public.apolices a where a.id = new.apolice_id), 'parcelas.baixa') then
    raise exception 'Você não tem permissão para dar baixa em parcelas.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger parcelas_checa_baixa before update of status on public.parcelas
  for each row execute function public.parcelas_checa_baixa();

revoke execute on function public.negocios_checa_vendedor(), public.apolices_checa_responsavel(), public.parcelas_checa_baixa() from public, anon, authenticated;
