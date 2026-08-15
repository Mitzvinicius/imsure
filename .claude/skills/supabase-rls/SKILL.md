---
name: supabase-rls
description: Row Level Security (RLS) no Supabase/PostgreSQL — indexação de colunas usadas em policies, encapsulamento de auth.uid() em (SELECT auth.uid()) para cache do plano de execução, e funções SECURITY DEFINER para evitar recursão. Use SEMPRE que estiver criando ou revisando tabelas, policies de acesso, ou qualquer query que dependa de auth.uid()/auth.jwt() no Supabase, mesmo que o usuário só peça "protege essa tabela" ou "cria a policy de acesso".
---

# Supabase Row Level Security: Performance e Correção

## As três otimizações obrigatórias

### 1. Indexe toda coluna usada em uma policy

Se uma policy filtra por `user_id = auth.uid()`, a coluna `user_id` precisa de índice (a menos que já seja chave primária). Sem índice, a policy vira um scan completo da tabela em toda query — a documentação oficial do Supabase relata melhorias de mais de 100x em tabelas grandes só com essa indexação.

```sql
create index if not exists idx_posts_user_id on posts (user_id);
```

### 2. Sempre encapsule `auth.uid()` em `(SELECT auth.uid())`

```sql
-- ❌ ERRADO: recalcula auth.uid() para CADA linha avaliada
create policy "usuarios veem seus proprios posts"
on posts for select
using (user_id = auth.uid());

-- ✅ CORRETO: o otimizador do Postgres cacheia o resultado por statement
create policy "usuarios veem seus proprios posts"
on posts for select
using (user_id = (select auth.uid()));
```

Envolver a função em `(select ...)` faz o otimizador do Postgres tratá-la como um `initPlan`, calculado uma vez por statement em vez de uma vez por linha. Essa regra vale para qualquer função estável usada na policy (`auth.jwt()` incluso), **desde que o resultado não varie por linha**.

### 3. Use `SECURITY DEFINER` para evitar recursão RLS

Quando uma policy de uma tabela precisa checar uma condição em **outra** tabela que também tem RLS (padrão comum em tabelas de junção many-to-many), consultar a segunda tabela diretamente na policy pode disparar a RLS dela recursivamente. Encapsule a checagem em uma função `SECURITY DEFINER`, que roda com os privilégios de quem a definiu, ignorando RLS internamente:

```sql
create or replace function public.is_team_member(team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from team_members
    where team_members.team_id = is_team_member.team_id
      and team_members.user_id = (select auth.uid())
  );
$$;

create policy "membros veem projetos do time"
on projects for select
using (is_team_member(team_id));
```

## Regra adicional: restrinja o role da policy

Sempre que possível, use `TO authenticated` (ou o role específico) na policy, para que o Postgres descarte requisições do role `anon` antes mesmo de avaliar a condição:

```sql
create policy "usuarios autenticados veem seus posts"
on posts for select
to authenticated
using (user_id = (select auth.uid()));
```

## Checklist ao criar uma nova tabela com RLS

1. `alter table X enable row level security;` foi executado?
2. Toda coluna referenciada em `using`/`with check` tem índice?
3. Toda chamada a `auth.uid()`/`auth.jwt()` está envolvida em `(select ...)`?
4. Existe alguma policy que consulta outra tabela com RLS? Se sim, ela usa uma função `security definer` em vez de subquery direta?
5. A policy especifica `to authenticated` (ou role apropriado) em vez de deixar implícito?
6. Para `insert`/`update`, você definiu `with check` além de `using`? (`using` controla o que é visível/editável; `with check` controla o que pode ser gravado)

Detalhes de otimização adicionais (ex.: policies para `service_role`, combinação de múltiplas policies) em `reference/policies-otimizadas.md`.
