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

## Como o usuário gosta de trabalhar (importante)
O usuário (Mitz) está aprendendo a programar e prefere método socrático: **não quer código pronto entregue de primeira** para conceitos que ele está aprendendo — prefere pseudocódigo/Portugol, perguntas guiadas, e tentar escrever ele mesmo antes de eu revisar. Boilerplate repetitivo e configuração de infraestrutura (bibliotecas, banco, etc.) podem ser feitos diretamente quando ele pedir explicitamente ("implementa pra mim").

Perfil: forte em lógica de programação e modelagem de banco relacional (vem do Bubble), ainda desenvolvendo sintaxe de JS/TS/Python/React/Next.js e ferramentas (Docker, deploy).
