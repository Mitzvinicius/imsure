-- Parte B (tarefas): notificações dentro do app, geradas só por triggers/funções do banco.

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  tipo text not null constraint notificacoes_tipo_check check (tipo in ('tarefa_atribuida','mencao','comentario_tarefa','prazo_hoje','tarefa_atrasada','tarefa_concluida')),
  titulo text not null,
  texto text,
  link text not null,
  tarefa_id uuid references public.tarefas(id) on delete cascade,
  chave text constraint notificacoes_chave_key unique, -- idempotência (lembrete do dia, comentário+destinatário)
  lida_em timestamptz,
  criado_em timestamptz not null default now()
);
create index notificacoes_usuario_lida_idx on public.notificacoes (usuario_id, lida_em, criado_em desc);
create index notificacoes_corretora_idx on public.notificacoes (corretora_id);
create index notificacoes_tarefa_idx on public.notificacoes (tarefa_id) where tarefa_id is not null;

alter table public.notificacoes enable row level security;
create policy dono_le_notificacao on public.notificacoes for select to authenticated
  using (usuario_id = (select auth.uid()));
create policy dono_marca_notificacao on public.notificacoes for update to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
-- Usuário só marca como lida: sem insert/delete e update só na coluna lida_em
revoke insert, update, delete on public.notificacoes from anon, authenticated;
grant update (lida_em) on public.notificacoes to authenticated;

create or replace function public.link_alvo(p_corretora_id uuid, p_negocio_id uuid, p_apolice_id uuid, p_sinistro_id uuid, p_contato_id uuid, p_tarefa_id uuid)
returns text language sql immutable set search_path = '' as $$
  select '/corretoras/' || p_corretora_id || case
    when p_negocio_id is not null then '/funis?negocio=' || p_negocio_id
    when p_apolice_id is not null then '/apolices/' || p_apolice_id || '?aba=atividades'
    when p_sinistro_id is not null then '/sinistros/' || p_sinistro_id
    when p_contato_id is not null then '/contatos/' || p_contato_id || '?aba=atividades'
    when p_tarefa_id is not null then '/tarefas?tarefa=' || p_tarefa_id
    else '/tarefas'
  end;
$$;

create or replace function public.notificar(p_usuario uuid, p_corretora_id uuid, p_tipo text, p_titulo text, p_texto text, p_link text, p_tarefa_id uuid, p_chave text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_usuario is null or public.escopo_de(p_usuario, p_corretora_id) is null then return; end if; -- só membros ativos
  insert into public.notificacoes (usuario_id, corretora_id, tipo, titulo, texto, link, tarefa_id, chave)
  values (p_usuario, p_corretora_id, p_tipo, p_titulo, p_texto, p_link, p_tarefa_id, p_chave)
  on conflict (chave) do update set tipo = excluded.tipo, titulo = excluded.titulo, texto = excluded.texto, link = excluded.link
    where excluded.tipo = 'mencao'; -- menção prevalece sobre "comentou na tarefa"; lembrete repetido não faz nada
end;
$$;

create or replace function public.nome_do_usuario(p_usuario uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select nome from public.usuarios where id = p_usuario), 'Alguém');
$$;

create or replace function public.tarefas_notifica()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_autor uuid := (select auth.uid());
begin
  if (tg_op = 'INSERT' or new.responsavel_usuario_id is distinct from old.responsavel_usuario_id)
     and new.responsavel_usuario_id is distinct from v_autor then
    perform public.notificar(new.responsavel_usuario_id, new.corretora_id, 'tarefa_atribuida',
      public.nome_do_usuario(v_autor) || ' atribuiu uma tarefa a você', new.titulo,
      public.link_alvo(new.corretora_id, null, null, null, null, new.id), new.id, null);
  end if;
  if tg_op = 'UPDATE' and new.status = 'concluida' and old.status <> 'concluida' and new.criado_por is distinct from v_autor then
    perform public.notificar(new.criado_por, new.corretora_id, 'tarefa_concluida',
      public.nome_do_usuario(v_autor) || ' concluiu uma tarefa', new.titulo,
      public.link_alvo(new.corretora_id, null, null, null, null, new.id), new.id, null);
  end if;
  return null;
end;
$$;
create trigger tarefas_notifica after insert or update on public.tarefas
  for each row execute function public.tarefas_notifica();

create or replace function public.comentarios_notifica()
returns trigger language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  if new.tarefa_id is null then return null; end if;
  select id, titulo, responsavel_usuario_id, criado_por, corretora_id into t from public.tarefas where id = new.tarefa_id;
  perform public.notificar(x.u, t.corretora_id, 'comentario_tarefa',
      public.nome_do_usuario(new.autor_usuario_id) || ' comentou na tarefa', t.titulo,
      public.link_alvo(t.corretora_id, null, null, null, null, t.id), t.id, 'comentario:' || new.id || ':' || x.u)
  from (select distinct u from unnest(array[t.responsavel_usuario_id, t.criado_por]) u) x
  where x.u is distinct from new.autor_usuario_id;
  return null;
end;
$$;
create trigger comentarios_notifica after insert on public.comentarios
  for each row execute function public.comentarios_notifica();

create or replace function public.mencoes_notifica()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select * into c from public.comentarios where id = new.comentario_id;
  if new.usuario_id = c.autor_usuario_id then return null; end if;
  perform public.notificar(new.usuario_id, c.corretora_id, 'mencao',
    public.nome_do_usuario(c.autor_usuario_id) || ' mencionou você', left(c.texto, 140),
    public.link_alvo(c.corretora_id, c.negocio_id, c.apolice_id, c.sinistro_id, c.contato_id, c.tarefa_id),
    c.tarefa_id, 'comentario:' || c.id || ':' || new.usuario_id);
  return null;
end;
$$;
create trigger mencoes_notifica after insert on public.comentario_mencoes
  for each row execute function public.mencoes_notifica();

-- Lembretes diários: prazo hoje / atrasada, uma notificação por tarefa por dia
create or replace function public.gerar_lembretes_tarefas(p_hoje date default (now() at time zone 'America/Sao_Paulo')::date)
returns void language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  for t in
    select id, corretora_id, titulo, responsavel_usuario_id, prazo from public.tarefas
    where status in ('a_fazer','em_andamento') and prazo <= p_hoje
  loop
    perform public.notificar(t.responsavel_usuario_id, t.corretora_id,
      case when t.prazo = p_hoje then 'prazo_hoje' else 'tarefa_atrasada' end,
      case when t.prazo = p_hoje then 'Tarefa para hoje' else 'Tarefa atrasada' end,
      t.titulo, public.link_alvo(t.corretora_id, null, null, null, null, t.id), t.id,
      'lembrete:' || t.id || ':' || p_hoje);
  end loop;
end;
$$;

revoke execute on function public.notificar(uuid, uuid, text, text, text, text, uuid, text), public.nome_do_usuario(uuid),
  public.tarefas_notifica(), public.comentarios_notifica(), public.mencoes_notifica(), public.gerar_lembretes_tarefas(date)
from public, anon, authenticated;

-- 10h UTC = 7h em São Paulo (sem horário de verão desde 2019)
select cron.schedule('lembretes-tarefas', '0 10 * * *', $$select public.gerar_lembretes_tarefas()$$);

-- Tempo real para o sino (RLS garante que cada um só recebe as suas)
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
alter publication supabase_realtime add table public.notificacoes;
