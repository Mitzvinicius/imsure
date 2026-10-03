# Contexto do projeto — imsure

> Este arquivo é lido por inteiro em toda sessão. Mantenha-o curto: só o que é verdade em qualquer parte do projeto e que não dá pra deduzir olhando o código. O racional completo por trás de cada decisão fica em [`docs/decisoes.md`](docs/decisoes.md) — aqui é só o mapa.

## Sobre o projeto
CRM/ERP para corretoras de seguros, multi-tenant (uma conta pode ter múltiplas corretoras/filiais).

- Branch atual: `sandbox-dashboard` (remote `origin` = https://github.com/Mitzvinicius/imsure)
- Gerenciador de pacotes: `pnpm` (migrado do npm pelo Carlos — `pnpm-lock.yaml` é o lockfile; o pnpm não está instalado globalmente na máquina do Mitz, então os comandos rodam via `npx -y pnpm@10 ...`)
- Projeto Supabase: `imsure` (ref `bmovnppkcvpjeieyugdz`)
- Existe um projeto irmão do tutorial "Next.js Learn Dashboard" puro em `nextjs-dashboard` (outra pasta, no OneDrive) — só referência de padrões, não é o mesmo repositório.

## Stack
- Next.js (App Router) + TypeScript
- Supabase (Postgres + RLS + Auth) — clientes em `utils/supabase/`: `server.ts` (Server Components/Actions; `createClient()` sem argumentos, lê os cookies sozinho), `client.ts` (browser), `middleware.ts` (renova a sessão, usado pelo `middleware.ts` da raiz). Variáveis em `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
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
| `/corretoras/[corretoraId]/contatos/[contatoId]` (`?aba=`) | `contatos/[contatoId]/ContatoDetail.tsx` + `_components/Aba*.tsx` | Ficha do contato em abas: Principais, Financeiro (renda, patrimônio financeiro e lista de bens vinculáveis a apólices de auto/residencial/empresarial), Família (parentes até 2º grau, vínculo invertido automático) e Saúde (peso, altura, IMC) |
| `/corretoras/[corretoraId]/equipe` (`?aba=`) | `equipe/EquipePage.tsx` | Membros (convite por link, cargo, desativar, transferir carteira, contador do plano), equipes com líder, cargos |
| `/corretoras/[corretoraId]/tarefas` (`?tarefa=`) | `tarefas/TarefasPage.tsx` | Tarefas agrupadas por prazo (Atrasadas/Hoje/7 dias/Depois/Sem prazo), filtros Minhas/Criadas/Equipe/Todas/Sem responsável ativo. O painel "Tarefas e conversa" (`app/ui/tarefas/TarefasEConversa.tsx`) aparece em negócio, apólice, sinistro e contato; sino de notificações no menu lateral |
| `/convite/[token]` | `app/convite/[token]/ConviteAceite.tsx` | Aceite de convite (login/cadastro com retorno via `?next=`) |
| `/corretoras/[corretoraId]/apolices` (+ `nova`, `[apoliceId]`, `[apoliceId]/editar`) | `apolices/ApolicesPage.tsx`, `_components/ApoliceForm.tsx`, `[apoliceId]/ApoliceDetail.tsx` | Carteira: lista com filtros, cadastro (bem segurado por ramo, coberturas, parcelas), detalhe com abas Parcelas/Endossos/Sinistros/Anexos |
| `/corretoras/[corretoraId]/sinistros` (+ `novo`, `[sinistroId]`) | `sinistros/SinistrosPage.tsx`, `novo/NovoSinistroForm.tsx`, `[sinistroId]/SinistroDetail.tsx` | Sinistros com status por ramo e histórico de andamentos |
| `/corretoras/[corretoraId]/configuracoes` | `configuracoes/ConfiguracoesPage.tsx` | Dias de antecedência e etapa do funil da renovação automática |

`app/corretoras/[corretoraId]/layout.tsx` é o layout compartilhado dessas duas últimas rotas: faz a guarda de autenticação/posse da corretora e renderiza a `Sidebar` (seletor de conta + nav Funis/Contatos) em volta do conteúdo.

`app/dashboard/page.tsx` e `app/ui/opportunities/table.tsx` são stubs/rascunho, provavelmente do colega trabalhando em paralelo na navegação/sidebar — status desconhecido, não mexer sem confirmar com ele.

## Server Actions
- `app/lib/actions.ts` — `criarConta`, `atualizarDadosCorretora`, `salvarRamosAtuacao`, `salvarFluxoVendas`, `selecionarPlano`, `concluirOnboarding`, `definirFunilAtivo`, `buscarContatos`, `criarNegocio`, `moverNegocio`, `atualizarNegocio`, `atualizarContato`, `deletarNegocio`, `marcarNegocioPerdido`, `reabrirNegocio`
- `app/lib/actions-equipe.ts` — `convidarMembro`, `gerarNovoLinkConvite`, `cancelarConvite`, `aceitarConvite`, `alterarCargoMembro`, `alterarStatusMembro`, `transferirCarteira`, `salvarEquipe`, `excluirEquipe`
- `app/lib/actions-contatos.ts` — `atualizarFichaContato`, `adicionarVinculo`, `removerVinculo`, `salvarBemPatrimonio`, `removerBemPatrimonio`, `vincularBemApolice`, `desvincularBemApolice`, `salvarSaude`
- `app/lib/actions-tarefas.ts` — `listarTarefasDoRegistro`, `criarTarefa`, `atualizarTarefa`, `alterarStatusTarefa`, `excluirTarefa`, `listarComentarios`, `comentar`, `editarComentario`, `excluirComentario`, `membrosQueVeem`, `buscarRegistros` (regras puras em `app/lib/tarefas/`: prazo, menções, filtros, links)
- `app/lib/actions-seguros.ts` — `criarApolice`, `atualizarApolice`, `cancelarApolice`, `adicionarParcelas`, `atualizarParcela`, `darBaixaManual`, `criarEndosso`, `listarAnexosApolice`, `uploadAnexoApolice`, `deletarAnexoApolice`, `criarSinistro`, `atualizarSinistro`, `registrarAndamento`, `atualizarConfiguracoesCorretora`
- Regras puras (testadas com Vitest) em `app/lib/seguros/`: ramos, datas, parcelas, status, sinistros, renovação, validação, mensagens de erro, tipos.
- `app/auth/actions.ts` — `signIn`, `createNewUser`
- **Padrão**: toda action retorna `{ error: string | null }`. Nenhuma lança exceção nem chama `redirect()` internamente — quem navega em caso de sucesso é o componente cliente (`router.push`/`router.refresh`). Isso evita um bug real do Next.js: `redirect()` dentro de um `try/catch` no cliente pode ser "engolido" e nunca navegar.

## Banco de dados (Supabase)
Hierarquia: `planos` → `contas` (dono = `owner_usuario_id`) → `corretoras` → `fluxos` → `etapas` → `negocios`. `corretoras` também tem `contatos` (pessoas cadastradas) — `negocios.contato_id` referencia `contatos`, `negocios.vendedor_usuario_id` referencia `usuarios`. `usuarios` espelha `auth.users` (criado via trigger `handle_new_user`).

Patrimônio: `contato_bens` (imóvel/veículo/outro) ↔ `contato_bem_apolices` (vínculo manual; FKs com `contato_id` garantem que a apólice é do mesmo cliente). Saúde: `contato_saude` (1:1, tabela separada por ser dado sensível — LGPD).

Família: `contato_vinculos` (corretora_id, contato_id, parente_id, parentesco) grava o vínculo **uma vez** ("parente é X do contato"); o lado inverso é derivado em `app/lib/contatos/parentesco.ts` (`parentescoInverso`, `parentesDoContato`). Índice único no par (qualquer sentido) e FKs compostas `(id, corretora_id)` garantem mesma corretora.

Seguros: `corretoras` → `apolices` (cliente = `contato_id`, `seguradora_id` → `seguradoras`, lista **global**) → `endossos`, `parcelas` (da apólice ou de um endosso — a apólice **não** é "endosso 0"), `coberturas`, `bens_auto`/`bens_residencial`/`bens_rc`/`vidas_seguradas` → `beneficiarios`, `sinistros` → `sinistro_andamentos`, `apolice_anexos` (bucket privado `apolice-anexos`). Negócio tem `status` (aberto/ganho/perdido, com `motivo_perda`/`observacao_perda`): emitir apólice marca ganho e move para a etapa `etapas.emissao` (escolhida em Configurações); perdido é manual com motivo. Renovação: `negocios.apolice_renovada_id`, `etapas.renovacao`, `corretoras.dias_antecedencia_renovacao`, função `criar_negocios_renovacao()` agendada diariamente via `pg_cron`. Migrações versionadas em `supabase/migrations/` (aplicadas pelo MCP do Supabase) e testes SQL em `supabase/tests/` (rodar com `execute_sql`; desfazem tudo com `rollback`).

Tarefas: `tarefas` (no máximo um vínculo: negócio/apólice/sinistro/contato; avulsa = nenhum), `comentarios` (exatamente um alvo, inclusive tarefa) + `comentario_mencoes` (RPC `comentar` grava os dois juntos), `notificacoes` (só triggers inserem; usuário só altera `lida_em`; publicada no Realtime para o sino). Lembretes diários `gerar_lembretes_tarefas()` às 7h de SP via `pg_cron`. `negocio_anotacoes` está obsoleta (migrada para `comentarios`).

RLS ativo em tudo. **Equipe**: membros via `usuario_corretora` (cargo por corretora; `cargos`/`cargo_permissoes`/catálogo `permissoes`; 5 cargos padrão criados por trigger em toda corretora, dono = Administrador). Funções definer: `usuario_possui_corretora` (membro ativo), `usuario_pode(corretora, permissao)`, `escopo_usuario`, `usuario_ve_responsavel`, `usuario_ve_contato`, `usuario_ve_negocio`, `usuario_possui_apolice`, `usuario_e_dono_conta`/`usuario_membro_conta` (evitam recursão contas↔corretoras). **Carteira por produto**: `negocios.vendedor_usuario_id` e `apolices.responsavel_usuario_id`; produtor vê só os próprios negócios/apólices (líder de equipe vê os da equipe). **Contatos são visíveis para toda a corretora** (evita duplicidade); fora da carteira (`usuario_ve_contato` falso) o membro só corrige telefone/e-mail (trigger `contatos_edicao_fora_da_carteira`) e não vê financeiro (`contato_financeiro`), família, patrimônio nem saúde; troca de responsável e baixa de parcela barradas por trigger sem permissão. Convites por link (`criar_convite`/`aceitar_convite`/`info_convite`; limite do plano em `uso_usuarios_conta`). UI lê `minhas_permissoes` no layout → `usePermissoes()` (que também expõe `usuarioId`). **Visibilidade por usuário**: as funções `*_de(p_usuario, ...)` (`escopo_de`, `ve_responsavel_de`, `ve_negocio_de`, `possui_apolice_de`, `ve_sinistro_de`, `ve_contato_de`, `usuario_alvo_ve_registro`, `ve_tarefa_linha`) são a fonte da verdade — as `usuario_*` são wrappers com `auth.uid()`. As `*_de` **não ficam expostas via API**; policies usam wrappers (`usuario_ve_alvo`, `usuario_ve_registro`, `usuario_ve_tarefa_linha`, `pode_mencionar`).

`contatos.cpf_cnpj` é um campo único (CPF **ou** CNPJ, detectado automaticamente pela quantidade de dígitos — vira `contatos.tipo_pessoa`), com constraint de unicidade por corretora.

## Design system
- Tema MUI em `app/ui/design/theme.ts` (light/dark), aplicado via `app/ui/design/ThemeRegistry.tsx` no layout raiz — mapeia as mesmas cores que estavam em `app/globals.css` (que hoje só guarda os tokens de cor como referência/fonte de verdade pro tema, não estiliza nada diretamente).
- Campos com máscara: `app/ui/design/CamposMascarados.tsx` (`CampoMoeda` — R$ preenchido da direita para a esquerda — e `CampoPercentual`), funções em `funis/masks.ts`.
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
- `pnpm dev` — ambiente local (no Claude: preview `imsure-dev` em `.claude/launch.json`)
- `pnpm build` — build de produção
- `pnpm lint` — lint
- `pnpm install` — dependências
- `pnpm test` — Vitest (lógica pura em `app/lib/seguros/*.test.ts`)

## Convenções de commit
Conventional Commits (`feat:`, `fix:`, `chore:`, ...) — commits anteriores no histórico não seguem esse padrão ainda (foram feitos antes dessa convenção ser adotada), mas é o padrão a seguir daqui pra frente.

## Pendências / bugs conhecidos
- Tailwind não está de fato ativo (falta `@import "tailwindcss"` em algum CSS) — não afeta nada hoje, já que todas as páginas reais usam MUI.
- **FSD**: reorganização das pastas em Feature-Sliced Design é intenção futura, ainda não aplicada — hoje o projeto segue a convenção padrão do App Router (`app/auth/`, `app/contas/`, `app/lib/`, `app/ui/design/`).
- **Stripe**: integração de pagamento real é intenção futura, ver nota no Stack acima.
- CPF/CNPJ só valida quantidade de dígitos (11 ou 14), não o dígito verificador de verdade — pendente, perguntado ao usuário, sem resposta ainda.
- Filtro avançado de funis tinha um campo "cotação válida até" no design original que não foi implementado — não existe campo correspondente no schema.
- **Turbopack (dev) trava com "Jest worker encountered N child process exceptions"** depois de muitas mudanças de estrutura de pasta (criar/mover/apagar arquivos em lote) — não é bug de código (o `next build` de produção sempre compilou limpo nessas ocasiões). Resolve com `rm -rf .next` + reiniciar o `pnpm dev`.
- **Projeto Supabase pausa sozinho** (plano gratuito) depois de ~7 dias sem uso — sintoma: app não carrega nenhuma página. Reativar pelo dashboard ou pela integração do Supabase (`restore_project`).
- `middleware.ts` da raiz: o Next 16 avisa que a convenção foi renomeada pra `proxy.ts` — só warning por enquanto.
- **Seguradoras**: lista inicial sem telefones de assistência/sinistro nem código SUSEP — preencher com fonte oficial.
- **Tarefas**: remover `negocio_anotacoes` numa migração futura; e-mail/WhatsApp como canais de notificação, tarefas recorrentes/automáticas ficaram fora do escopo.
- **Roadmap do portal do cliente** (ver `docs/superpowers/specs/2026-10-02-base-seguros-design.md`): etapa 1 (base de seguros) feita; faltam 1b baixa de comissão, 2 portal + PWA, 3 ações do cliente (aviso de sinistro/assistência), 4 comunicação (lembretes, renovação, promoções).
- Equipe: faltam tela de cargos personalizados (Pro/Business), acesso global de sócios (Business), cobrança do usuário extra (Stripe), atribuição automática por ramo da equipe. Colunas financeiras de `contatos` (renda etc.) não têm controle por coluna — só importa quando existir cargo personalizado sem `contatos.financeiro.ver`.
- Ainda não existem: enforcement dos demais limites de plano (corretoras, funis) na aplicação.

## Como o usuário gosta de trabalhar (importante)
**Neste projeto, o Claude desenvolve o código e o usuário (Mitz) foca no produto.** Nada de método socrático, pseudocódigo ou "tenta escrever primeiro": implemente direto (features, correções, schema, infra), verifique que funciona e reporte o que foi feito. O papel do Mitz é decidir o quê e o porquê — requisitos, regras de negócio, prioridades, UX.

- Em dúvidas de produto/regra de negócio que mudam o resultado, pergunte antes; em decisões técnicas, escolha a melhor opção e explique em uma linha.
- Ao reportar, fale em termos de produto (o que o usuário final vê/consegue fazer agora), com detalhes técnicos só quando relevantes.
- Perguntas abertas de arquitetura/produto ("me dá sua opinião") pedem recomendação clara + trade-off, não lista de opções.

Perfil: forte em lógica de programação e modelagem de banco relacional (vem do Bubble).
