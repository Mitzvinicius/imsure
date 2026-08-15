# Supabase RLS — padrões avançados de policies

## `using` vs `with check`

- `using`: controla quais linhas são **visíveis/afetáveis** por `select`, `update`, `delete`.
- `with check`: controla quais linhas **podem ser gravadas** por `insert`/`update`. Sem `with check` explícito em um `update`, o Postgres reaproveita a condição de `using` — o que pode não ser o que você quer (ex.: permitir editar um post mas não permitir "roubar" a autoria trocando `user_id`).

```sql
create policy "usuarios editam seus proprios posts"
on posts for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid())); -- impede trocar o dono no update
```

## Combinando múltiplas policies na mesma operação

O Postgres combina múltiplas policies permissivas (o padrão) com `OR`. Se você precisa de uma condição restritiva que sempre se aplica (ex.: "nunca acessar linhas soft-deleted, independente de qualquer outra regra"), use uma policy `as restrictive`:

```sql
create policy "esconde registros deletados"
on posts as restrictive
for select
using (deleted_at is null);
```

Policies restritivas são combinadas com `AND` entre si e com o conjunto de permissivas — ou seja, essa condição sempre precisa ser verdadeira, não importa quantas policies permissivas existam.

## Acesso de `service_role` (bypass intencional)

Código de servidor que usa a `service_role` key **ignora RLS por padrão** — isso é intencional para jobs administrativos e Route Handlers confiáveis. Nunca exponha a `service_role` key ao cliente (browser). Se um Route Handler do Next.js usa `service_role`, a responsabilidade de checar autorização passa a ser 100% do seu código de aplicação, não do banco — trate isso como superfície de risco elevada e revise com atenção redobrada.

## Testando policies rapidamente

```sql
-- simula a sessão de um usuário específico para testar a policy manualmente
select set_config('request.jwt.claims', '{"sub":"<uuid-do-usuario>","role":"authenticated"}', true);
set role authenticated;

select * from posts; -- deve retornar só o que a policy permite

reset role;
```

## Erros comuns

- Esquecer de habilitar RLS na tabela (`enable row level security`) — sem isso, **nenhuma** policy é aplicada e a tabela fica totalmente aberta se exposta via API.
- Criar a policy mas esquecer o `to authenticated`, deixando o role `anon` ser avaliado desnecessariamente contra a condição.
- Colocar lógica de negócio complexa (múltiplos joins) direto na condição `using` sem uma função auxiliar — dificulta tanto a leitura quanto a otimização pelo planner.
