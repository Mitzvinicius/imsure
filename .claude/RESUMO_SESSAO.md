# Resumo da sessão — imsure (atualizado em 2026-10-03)

> Leia primeiro o [`CLAUDE.md`](../CLAUDE.md) (mapa) e o [`docs/decisoes.md`](../docs/decisoes.md) (porquês). Este arquivo diz **onde paramos e o que vem a seguir**.

## Modo de trabalho
O Claude desenvolve o código e o Mitz foca no produto (sem método socrático). Fluxo usado: brainstorming (perguntas uma por vez → spec aprovada) → plano em `docs/superpowers/plans/` → execução inline com TDD + revisão final independente → PR.

## Estado atual (branches e PRs)
- `feat/base-seguros` → **PR #1** (base: `sandbox-dashboard`), aberto. Base de seguros (apólices, endossos, parcelas, sinistros, renovação), status ganho/perdido, filtros do funil, máscaras, ficha do contato em abas (patrimônio, família, saúde).
- `feat/equipe-tarefas` → **PR #2** (base: `feat/base-seguros`, empilhado), aberto. Equipe parte A: convites por link, cargos/permissões, equipes, carteira por produto, limite de usuários por plano, contatos compartilhados na corretora.
- Todas as migrações de `supabase/migrations/` já estão **aplicadas** no Supabase (`bmovnppkcvpjeieyugdz`). Testes SQL em `supabase/tests/` (rodar com `execute_sql`; desfazem tudo).
- O Mitz testou ponta a ponta com uma segunda conta (produtor) e funcionou.

## Próximo passo
**Parte B do módulo de equipe: tarefas, conversa interna (@menções) e notificações.**
- Spec aprovada: `docs/superpowers/specs/2026-10-03-tarefas-design.md`.
- Falta: montar o plano de implementação (skill writing-plans) e executar. Trabalhar numa branch nova a partir de `feat/equipe-tarefas` (ex.: `feat/tarefas`).
- Decisões já tomadas: tarefas ligadas a negócio/apólice/sinistro/contato (ou avulsas); comentários com @menção em cada registro; notificações só dentro do app (sino em tempo real via Supabase Realtime + "Minhas tarefas"); lembretes diários às 7h via `pg_cron`; anotações do negócio migram para comentários; responsável e menção só para quem enxerga o registro.

## Pendências registradas (menores)
- Baixa de parcela via INSERT com status pago sem permissão; responsável de apólice via negócio de outra corretora; `uso_usuarios_conta` legível por qualquer logado; mensagem de limite sem separar convites pendentes; renovação para responsável desativado; desempenho (policies permissivas múltiplas, FKs sem índice).
- Da etapa de seguros: datas de timestamp mostradas em UTC após 21h; confirmação ao cancelar apólice; stepper do sinistro "negado"; telefones/SUSEP das seguradoras vazios; dígito verificador de CPF/CNPJ.
- Roadmap do portal do cliente: 1b baixa de comissão, 2 portal + PWA, 3 ações do cliente, 4 comunicação (ver spec `2026-10-02-base-seguros-design.md`).

## Dicas de ambiente
- `pnpm` via `npx -y pnpm@10 ...`; preview `imsure-dev` em `.claude/launch.json`.
- Não rodar `pnpm build` com o dev server ligado (derruba o preview); usar `npx tsc --noEmit -p .`.
- Supabase free pausa após ~7 dias sem uso.
