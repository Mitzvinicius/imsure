# Contexto do projeto — imsure

## Sobre o projeto
CRM/ERP para corretoras de seguros, multi-tenant (uma conta pode ter múltiplas corretoras/filiais). Next.js (App Router) + TypeScript + Supabase (Postgres + Auth) + MUI (Material UI).

- Branch atual: `sandbox-dashboard` (remote `origin` = https://github.com/Mitzvinicius/imsure)
- Gerenciador de pacotes: `npm`
- Projeto Supabase: `imsure` (ref `bmovnppkcvpjeieyugdz`)
- Existe um projeto irmão do tutorial "Next.js Learn Dashboard" puro em `nextjs-dashboard` (outra pasta, no OneDrive) — só referência de padrões, não é o mesmo repositório.
- **Para o racional completo por trás de cada decisão abaixo, ver [`docs/decisoes.md`](docs/decisoes.md).** Este arquivo é só o mapa; lá está o "porquê".

## Estrutura de páginas

| Rota | Componente | O que faz |
|---|---|---|
| `/auth` | `app/auth/AuthPage.tsx` | Login/cadastro (e-mail+senha e Google OAuth), layout de 2 colunas |
| `/auth/callback` | `app/auth/callback/route.ts` | Troca o `code` do fluxo PKCE por sessão |
| `/contas` | `app/contas/AccountsPage.tsx` | Lista as contas (empresas) do usuário, cria conta nova |
| `/onboarding/[corretoraId]` | `app/onboarding/[corretoraId]/OnboardingWizard.tsx` | Onboarding em 5 etapas, estilo Typeform (tela cheia, uma etapa por vez) |
| `/contatos` | `app/contatos/page.tsx` | Feature de contatos (CRM), anterior ao trabalho de Supabase — **ainda usa dados mockados** (`app/lib/placeholder_data.ts`), não migrada pro banco |

`app/dashboard/page.tsx` e `app/ui/opportunities/table.tsx` são stubs/rascunho, provavelmente do colega trabalhando em paralelo na navegação/sidebar — status desconhecido, não mexer sem confirmar com ele.

## Server Actions
- `app/lib/actions.ts` — `criarConta`, `atualizarDadosCorretora`, `salvarRamosAtuacao`, `salvarFluxoVendas`, `selecionarPlano`, `concluirOnboarding`
- `app/auth/actions.ts` — `signIn`, `createNewUser`
- **Padrão**: toda action retorna `{ error: string | null }`. Nenhuma lança exceção nem chama `redirect()` internamente — quem navega em caso de sucesso é o componente cliente (`router.push`/`router.refresh`). Isso evita um bug real do Next.js: `redirect()` dentro de um `try/catch` no cliente pode ser "engolido" e nunca navegar.

## Banco de dados (Supabase)
Hierarquia: `planos` → `contas` (dono = `owner_usuario_id`) → `corretoras` → `fluxos` → `etapas`. `usuarios` espelha `auth.users` (criado via trigger `handle_new_user`).

RLS ativo em tudo. Modelo de autorização: **dono da `conta` controla tudo abaixo na hierarquia** (verificado via subquery `contas.owner_usuario_id = auth.uid()` em cada tabela filha). `usuario_corretora` (multi-usuário por corretora) ainda não existe — hoje só o dono acessa.

## Design system
- Tema MUI em `app/ui/design/theme.ts` (light/dark), aplicado via `app/ui/design/ThemeRegistry.tsx` no layout raiz — mapeia as mesmas cores que estavam em `app/globals.css` (que hoje só guarda os tokens de cor como referência, não estiliza nada diretamente).
- Helpers compartilhados em `app/ui/design/`: `avatar.tsx` (iniciais/cor por nome), `icons.tsx` (só o logo do Google, que o MUI não tem).
- Padrão de página: `page.tsx` (Server Component — busca dados, guarda de autenticação) + `NomeDaPagina.tsx` (Client Component — interatividade).

## Pendências / bugs conhecidos
- `contas` não tem policy de `UPDATE` → `selecionarPlano` está quebrado (RLS bloqueia a troca de plano).
- Tailwind não está de fato ativo (falta `@import "tailwindcss"` em algum CSS) — só afeta `app/page.tsx` (a página inicial padrão do `create-next-app`, não usada de verdade).
- Ainda não existem: `usuario_corretora` (convite de equipe), `cargos`, domínio de seguros de verdade (contatos reais ligados a `corretoras`, negociações, apólices, sinistros).

# CLAUDE.md — imsure

> Este arquivo é lido por inteiro em TODA sessão. Mantenha-o curto: só o que é
> verdade em qualquer parte do projeto e que o Claude não consegue deduzir
> sozinho olhando o código. Detalhes de "como fazer X" vivem nas skills
> em `.claude/skills/` — aqui só ficam os ponteiros e as invariantes.

## Stack

- Next.js (App Router) + TypeScript
- Material UI (MUI)
- Stripe (pagamentos)
- Supabase (Postgres + RLS + Auth)

## Invariantes não-negociáveis

Estas regras nunca devem ser violadas, independente da tarefa. Para reforço
real (não apenas instrução), as mais críticas também estão protegidas por
hooks/CI — ver `.claude/hooks/`.

- Server Components são o padrão. `'use client'` só nas folhas da árvore que
  realmente precisam de interatividade.
- Toda tabela do Supabase exposta via API tem RLS habilitado antes do deploy.
- `auth.uid()` em policies sempre encapsulado em `(select auth.uid())`.
- Webhooks do Stripe são sempre idempotentes (checagem + registro na mesma
  transação do efeito de negócio).
- Toda entidade criada via Meta Ads (campanha, ad set, ad) nasce em estado
  PAUSADO. Ativação exige confirmação humana explícita — nunca automatize.
- Nunca commitar segredos (`.env*` sempre no `.gitignore`).

## Onde encontrar cada padrão

O conhecimento detalhado de cada domínio vive em skills — o Claude Code as
carrega automaticamente quando a tarefa é relevante. Não duplique esse
conteúdo aqui.

| Domínio | Skill |
|---|---|
| Server/Client Components, RSC, composição | `nextjs-app-router` |
| Organização de pastas e imports (FSD) | `fsd-architecture` |
| Tema MUI, Emotion cache, Pigment CSS | `mui-styling` |
| Checkout, assinaturas, webhooks | `stripe-integration` |
| Automação de campanhas Meta Ads | `meta-ads-automation` |
| Policies de acesso ao banco | `supabase-rls` |
| Branching de banco, busca vetorial | `neon-pgvector` |
| Metadata, Core Web Vitals, JSON-LD | `seo-web-vitals` |

## Comandos do projeto

- `npm run dev` — ambiente local
- `npm run lint` — lint (rode antes de reportar qualquer tarefa concluída)
- `npm run test` — testes
- `npm run build` — build de produção (rode antes de qualquer deploy)

## Convenções de commit

- Conventional Commits (`feat:`, `fix:`, `chore:`, ...)
- PRs pequenos, um propósito por PR