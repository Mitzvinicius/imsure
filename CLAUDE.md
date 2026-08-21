# Contexto do projeto — imsure

> Este arquivo é lido por inteiro em toda sessão. Mantenha-o curto: só o que é verdade em qualquer parte do projeto e que não dá pra deduzir olhando o código. O racional completo por trás de cada decisão fica em [`docs/decisoes.md`](docs/decisoes.md) — aqui é só o mapa.

## Sobre o projeto
CRM/ERP para corretoras de seguros, multi-tenant (uma conta pode ter múltiplas corretoras/filiais).

- Branch atual: `sandbox-dashboard` (remote `origin` = https://github.com/Mitzvinicius/imsure)
- Gerenciador de pacotes: `npm`
- Projeto Supabase: `imsure` (ref `bmovnppkcvpjeieyugdz`)
- Existe um projeto irmão do tutorial "Next.js Learn Dashboard" puro em `nextjs-dashboard` (outra pasta, no OneDrive) — só referência de padrões, não é o mesmo repositório.

## Stack
- Next.js (App Router) + TypeScript
- Supabase (Postgres + RLS + Auth)
- Material UI (MUI) — usado em todo o projeto, ícones e componentes
- **Planejado, ainda não integrado**: Stripe (pagamentos/assinaturas). Hoje a escolha de plano no onboarding só grava a preferência (`contas.plano_id`), sem cobrança real.

## Estrutura de páginas

| Rota | Componente | O que faz |
|---|---|---|
| `/` | `app/page.tsx` | Landing simples, só com CTA pra `/auth` |
| `/auth` | `app/auth/AuthPage.tsx` | Login/cadastro (e-mail+senha e Google OAuth), layout de 2 colunas |
| `/auth/callback` | `app/auth/callback/route.ts` | Troca o `code` do fluxo PKCE por sessão |
| `/contas` | `app/contas/AccountsPage.tsx` | Lista as contas (empresas) do usuário, cria conta nova |
| `/onboarding/[corretoraId]` | `app/onboarding/[corretoraId]/OnboardingWizard.tsx` | Onboarding em 5 etapas, estilo Typeform (tela cheia, uma etapa por vez) |
| `/corretoras/[corretoraId]/funis` | `app/corretoras/[corretoraId]/funis/FunisPage.tsx` | Kanban/Lista de negócios do funil ativo da corretora |
| `/corretoras/[corretoraId]/contatos` | `app/corretoras/[corretoraId]/contatos/ContatosPage.tsx` | Lista de contatos da corretora (lê do banco de verdade) |

`app/corretoras/[corretoraId]/layout.tsx` é o layout compartilhado dessas duas últimas rotas: faz a guarda de autenticação/posse da corretora e renderiza a `Sidebar` (seletor de conta + nav Funis/Contatos) em volta do conteúdo.

`app/dashboard/page.tsx` e `app/ui/opportunities/table.tsx` são stubs/rascunho, provavelmente do colega trabalhando em paralelo na navegação/sidebar — status desconhecido, não mexer sem confirmar com ele.

## Server Actions
- `app/lib/actions.ts` — `criarConta`, `atualizarDadosCorretora`, `salvarRamosAtuacao`, `salvarFluxoVendas`, `selecionarPlano`, `concluirOnboarding`, `definirFunilAtivo`, `buscarContatos`, `criarNegocio`, `moverNegocio`, `atualizarNegocio`, `atualizarContato`, `deletarNegocio`
- `app/auth/actions.ts` — `signIn`, `createNewUser`
- **Padrão**: toda action retorna `{ error: string | null }`. Nenhuma lança exceção nem chama `redirect()` internamente — quem navega em caso de sucesso é o componente cliente (`router.push`/`router.refresh`). Isso evita um bug real do Next.js: `redirect()` dentro de um `try/catch` no cliente pode ser "engolido" e nunca navegar.

## Banco de dados (Supabase)
Hierarquia: `planos` → `contas` (dono = `owner_usuario_id`) → `corretoras` → `fluxos` → `etapas` → `negocios`. `corretoras` também tem `contatos` (pessoas cadastradas) — `negocios.contato_id` referencia `contatos`, `negocios.vendedor_usuario_id` referencia `usuarios`. `usuarios` espelha `auth.users` (criado via trigger `handle_new_user`).

RLS ativo em tudo. Modelo de autorização: **dono da `conta` controla tudo abaixo na hierarquia** (verificado via subquery `contas.owner_usuario_id = auth.uid()` em cada tabela filha, subindo a cadeia de FKs). `usuario_corretora` (multi-usuário por corretora) ainda não existe — hoje só o dono acessa; `negocios.vendedor_usuario_id` já existe pensando nisso (ver `docs/decisoes.md`).

`contatos.cpf_cnpj` é um campo único (CPF **ou** CNPJ, detectado automaticamente pela quantidade de dígitos — vira `contatos.tipo_pessoa`), com constraint de unicidade por corretora.

## Design system
- Tema MUI em `app/ui/design/theme.ts` (light/dark), aplicado via `app/ui/design/ThemeRegistry.tsx` no layout raiz — mapeia as mesmas cores que estavam em `app/globals.css` (que hoje só guarda os tokens de cor como referência/fonte de verdade pro tema, não estiliza nada diretamente).
- Helpers compartilhados em `app/ui/design/`: `avatar.tsx` (iniciais/cor por nome), `icons.tsx` (só o logo do Google, que o MUI não tem — o resto dos ícones vem de `@mui/icons-material`).
- Padrão de página: `page.tsx` (Server Component — busca dados, guarda de autenticação) + `NomeDaPagina.tsx` (Client Component — interatividade).

## Invariantes (boas práticas do projeto, não impostas por hook/CI ainda)
- Server Components são o padrão. `'use client'` só nos componentes que realmente precisam de interatividade (hooks, event handlers).
- Toda tabela nova do Supabase ganha RLS habilitado (isso já é automático aqui via event trigger `rls_auto_enable`) — mas **não esquecer de criar as policies** logo em seguida (RLS sem policy = tabela inacessível até alguém lembrar, é assim que o bug do `selecionarPlano` aconteceu).
- `auth.uid()` em policies sempre encapsulado em `(select auth.uid())` — é o padrão usado em todas as policies criadas até aqui.
- Nunca commitar segredos (`.env*` já está no `.gitignore`).

## Onde encontrar cada padrão
Skills instaladas em `.claude/skills/` — carregadas automaticamente quando a tarefa é relevante:

| Domínio | Skill |
|---|---|
| Server/Client Components, RSC, composição | `nextjs-app-router` |
| Organização de pastas e imports (FSD) | `fsd-architecture` — **ainda não seguido no projeto**, que hoje usa a convenção padrão do App Router; ver nota abaixo |
| Tema MUI, Emotion cache | `mui-styling` |
| Checkout, assinaturas, webhooks | `stripe-integration` — só relevante quando o Stripe for integrado de verdade |
| Policies de acesso ao banco | `supabase-rls` |

## Comandos do projeto
- `npm run dev` — ambiente local
- `npm run build` — build de produção
- `npm run lint` — lint
- Não existe suíte de testes configurada ainda (`npm run test` não existe no `package.json`).

## Convenções de commit
Conventional Commits (`feat:`, `fix:`, `chore:`, ...) — commits anteriores no histórico não seguem esse padrão ainda (foram feitos antes dessa convenção ser adotada), mas é o padrão a seguir daqui pra frente.

## Pendências / bugs conhecidos
- `contas` não tem policy de `UPDATE` → `selecionarPlano` está quebrado (RLS bloqueia a troca de plano).
- Tailwind não está de fato ativo (falta `@import "tailwindcss"` em algum CSS) — não afeta nada hoje, já que todas as páginas reais usam MUI.
- **FSD**: reorganização das pastas em Feature-Sliced Design é intenção futura, ainda não aplicada — hoje o projeto segue a convenção padrão do App Router (`app/auth/`, `app/contas/`, `app/lib/`, `app/ui/design/`).
- **Stripe**: integração de pagamento real é intenção futura, ver nota no Stack acima.
- CPF/CNPJ só valida quantidade de dígitos (11 ou 14), não o dígito verificador de verdade — pendente, perguntado ao usuário, sem resposta ainda.
- Filtro avançado de funis tinha um campo "cotação válida até" no design original que não foi implementado — não existe campo correspondente no schema.
- **Turbopack (dev) trava com "Jest worker encountered N child process exceptions"** depois de muitas mudanças de estrutura de pasta (criar/mover/apagar arquivos em lote) — não é bug de código (o `next build` de produção sempre compilou limpo nessas ocasiões). Resolve com `rm -rf .next` + reiniciar o `npm run dev`.
- Ainda não existem: `usuario_corretora` (convite de equipe), `cargos`, domínio de seguros de verdade além de `negocios`/`contatos` (apólices, endossos, sinistros), enforcement de limites de plano na aplicação.

## Como o usuário gosta de trabalhar (importante)
O usuário (Mitz) está aprendendo a programar e prefere método socrático: **não quer código pronto entregue de primeira** para conceitos que ele está aprendendo — prefere pseudocódigo/Portugol, perguntas guiadas, e tentar escrever ele mesmo antes de eu revisar. Boilerplate repetitivo e configuração de infraestrutura (bibliotecas, banco, etc.) podem ser feitos diretamente quando ele pedir explicitamente ("implementa pra mim").

Perfil: forte em lógica de programação e modelagem de banco relacional (vem do Bubble), ainda desenvolvendo sintaxe de JS/TS/Python/React/Next.js e ferramentas (Docker, deploy).
