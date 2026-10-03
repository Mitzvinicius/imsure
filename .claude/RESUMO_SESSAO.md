# Resumo da sessão — imsure (atualizado em 2026-10-03, fim da parte B)

> Leia primeiro o [`CLAUDE.md`](../CLAUDE.md) (mapa) e o [`docs/decisoes.md`](../docs/decisoes.md) (porquês). Este arquivo diz **onde paramos e o que vem a seguir**.

## Modo de trabalho
O Claude desenvolve o código e o Mitz foca no produto (sem método socrático). Fluxo usado: brainstorming (perguntas uma por vez → spec aprovada) → plano em `docs/superpowers/plans/` → execução inline com TDD + revisão final independente → PR.

## Estado atual (branches e PRs)
- `feat/base-seguros` → **PR #1** (base: `sandbox-dashboard`), aberto. Base de seguros, status ganho/perdido, filtros do funil, ficha do contato em abas.
- `feat/equipe-tarefas` → **PR #2** (base: `feat/base-seguros`, empilhado), aberto. Equipe parte A: convites, cargos/permissões, equipes, carteira por produto, contatos compartilhados.
- `feat/tarefas` → **PR #3** (base: `feat/equipe-tarefas`, empilhado), aberto. Parte B (empilhada sobre `feat/equipe-tarefas`): tarefas ligadas a registros, conversa com @menções, notificações no sino em tempo real, lembretes às 7h, página Tarefas. Plano: `docs/superpowers/plans/2026-10-03-tarefas.md`.
- Todas as migrações de `supabase/migrations/` estão **aplicadas** no Supabase (`bmovnppkcvpjeieyugdz`), inclusive `20261005120000_tarefas_base`, `20261005120050_tarefas_privilegios`, `20261005120100_tarefas_notificacoes`. Testes SQL em `supabase/tests/` (rodar com `execute_sql`; desfazem tudo).

## Próximo passo
- Parte B testada pelo Mitz com as duas contas (sino em tempo real, @menção, concluir): funcionou. PR #3 (`feat/tarefas` → `feat/equipe-tarefas`) aberto. Ordem de merge: #1 → #2 → #3.
- Em seguida, o que o Mitz priorizar: roadmap do portal do cliente ou as pendências abaixo (os 4 ajustes pequenos das tarefas — filtros, canceladas, link de negócio de outro funil, sino por corretora — já foram resolvidos).

## Pendências registradas (menores)
- Tarefas: remover `negocio_anotacoes`; canais e-mail/WhatsApp; tarefas recorrentes/automáticas (fora de escopo).
- Lint com 2 erros pré-existentes (`react-hooks/set-state-in-effect`) em `funis/FunisPage.tsx` e `app/ui/design/ThemeRegistry.tsx`.
- Baixa de parcela via INSERT com status pago sem permissão; responsável de apólice via negócio de outra corretora; `uso_usuarios_conta` legível por qualquer logado; mensagem de limite sem separar convites pendentes; renovação para responsável desativado; desempenho (policies permissivas múltiplas, FKs sem índice).
- Da etapa de seguros: datas de timestamp mostradas em UTC após 21h; confirmação ao cancelar apólice; stepper do sinistro "negado"; telefones/SUSEP das seguradoras vazios; dígito verificador de CPF/CNPJ.
- Roadmap do portal do cliente: 1b baixa de comissão, 2 portal + PWA, 3 ações do cliente, 4 comunicação (ver spec `2026-10-02-base-seguros-design.md`).

## Dicas de ambiente
- `pnpm` via `npx -y pnpm@10 ...`; preview `imsure-dev` em `.claude/launch.json`.
- Não rodar `pnpm build` com o dev server ligado (derruba o preview); usar `npx tsc --noEmit -p .`.
- Supabase free pausa após ~7 dias sem uso.
