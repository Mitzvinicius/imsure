# Decisões do projeto — imsure

> Este arquivo guarda o "porquê" por trás das decisões técnicas e de produto. O `CLAUDE.md` é o mapa enxuto; aqui está o raciocínio completo, pra não perder o contexto quando a conversa que gerou a decisão não estiver mais disponível.

## Arquitetura multi-tenant

**Hierarquia**: `contas` (quem paga o plano) → `corretoras` (filiais/tenants) → `usuarios` (vinculados via tabela de junção, ainda não criada).

- Uma **conta** é a entidade de cobrança — não é uma pessoa que loga, é quem assina o plano.
- Uma **corretora** é a unidade operacional (equivalente a "tenant"). Uma conta pode ter várias corretoras (múltiplas filiais), mas hoje o fluxo de criação (`criarConta`) só cria uma conta + uma corretora juntas, 1:1. Criar uma segunda corretora pra uma conta existente ainda não tem fluxo próprio.
- **Owner de conta**: toda conta tem `owner_usuario_id` (not null) — é quem criou a conta. Só o owner deveria poder excluir a conta, mudar plano, transferir titularidade (essa regra ainda é só de aplicação, não tem enforcement extra além do RLS).
- **Acesso de múltiplos usuários por corretora** (`usuario_corretora`, com cargo) e **acesso global read-only pra sócios** (`usuario_conta_acesso_global`) ainda não existem. Hoje, só o dono da conta acessa qualquer coisa.

### Por que essa hierarquia e não algo mais simples
Decisão original vinda de um documento de planejamento anterior a esta sessão: pensando em corretoras que têm múltiplas filiais, ou em um sócio que precisa ver dados de várias corretoras sem estar operacionalmente vinculado a cada uma. Simplificar pra "1 usuário = 1 corretora" resolveria o MVP mas exigiria uma migração maior depois.

## Autenticação (Supabase Auth + PKCE)

- Fluxo **PKCE** (recomendado pela Supabase pra Server-Side Rendering) em vez de implicit flow. Exige uma rota de callback (`app/auth/callback/route.ts`) que troca o `code` da URL por sessão via `exchangeCodeForSession`.
- `utils/supabase/{client,server,middleware}.ts` — os três clientes do padrão oficial `@supabase/ssr`. O `middleware.ts` na raiz do projeto é o que efetivamente dispara a renovação de sessão a cada request (rodando `supabase.auth.getUser()`).
- **Google OAuth**: `signInWithOAuth` chamado do lado do cliente (`app/auth/AuthPage.tsx`), com `redirectTo` apontando pra `/auth/callback`. Requer configuração manual no Google Cloud Console + Dashboard do Supabase (Client ID/Secret) — isso não é gerenciável via código/MCP, é passo manual do usuário.
- **`handle_new_user()`** — trigger `SECURITY DEFINER` em `auth.users`, cria a linha espelho em `public.usuarios` (nome vem de `raw_user_meta_data->>'nome'`, passado no `signUp` via `options.data`). Só isso — **não** cria conta/corretora automaticamente. Essa separação foi uma correção deliberada: a versão anterior dessa trigger criava conta+corretora automaticamente pra todo cadastro, o que quebraria o caso de alguém sendo **convidado** pra uma corretora já existente (ganharia uma conta fantasma extra). Criar a conta é uma ação explícita do usuário, depois de já estar logado.

### Por que `public.usuarios` existe, já que tem `auth.users`
`auth.users` é gerenciada pelo GoTrue (serviço de Auth do Supabase): não dá pra adicionar colunas customizadas nela com segurança, e ela não é exposta via API/RLS pro app consultar normalmente. Por isso o padrão (usado nos templates oficiais do Supabase) é ter uma tabela espelho no schema `public` com os campos de aplicação (`nome`, `ativo`, etc.).

### `usuarios.ativo` vs. status de participação numa corretora
`usuarios.ativo` é o soft-delete **global** da pessoa (LGPD — nunca hard-delete do lado do Auth pela aplicação). É um conceito diferente de "essa pessoa está ativa **nesta** corretora específica" — isso último vai morar num campo próprio em `usuario_corretora` quando essa tabela for criada, não em `usuarios`.

## RLS e modelo de segurança

Todas as tabelas em `public` têm RLS ativado automaticamente ao serem criadas (event trigger `rls_auto_enable`, que já existia no banco antes desta sessão). O modelo de autorização usado em toda a hierarquia: **dono da conta controla tudo abaixo**, verificado via subquery que sobe a cadeia até `contas.owner_usuario_id = auth.uid()`.

- `contas`: policies de `INSERT` e `SELECT` restritas a `owner_usuario_id = auth.uid()`. **Falta a policy de `UPDATE`** — bug conhecido, ver seção de pendências.
- `corretoras`, `fluxos`, `etapas`: policies verificam a posse subindo a cadeia de foreign keys até a conta.
- `planos`: `SELECT` liberado pra qualquer `authenticated` — é só o catálogo público de planos, não é dado sensível.
- `usuarios`: RLS ativado, **sem nenhuma policy** — proposital. Só a trigger `handle_new_user` (que roda como `SECURITY DEFINER`, ignorando RLS) escreve nela. Nem o próprio usuário lê essa tabela via API hoje; o nome de exibição vem de `auth.getUser().user_metadata`, não de uma consulta a `usuarios`.

Revisão de segurança feita nesta sessão (foco: um usuário acessar dados de outro) não encontrou brechas — todo ponto de escrita/leitura que usa um ID vindo do cliente (URL, argumento de Server Action) é reconferido pelo RLS no banco, não só pela lógica da aplicação. Ver histórico da conversa pra detalhes se precisar revisitar.

## Sistema de planos

| Plano | Preço mensal | Corretoras (`limite_tenants`) | Cargos customizados | Acesso global | Fluxos por corretora |
|---|---|---|---|---|---|
| Starter | R$ 49,90 | 1 | não | não | 1 |
| Pro | R$ 99,90 | 1 | sim | não | 3 |
| Business | R$ 349,90 | 5 | sim | sim | ilimitado (`null`) |

A escolha de plano acontece na Etapa 4 do onboarding, **só registra a preferência** (`contas.plano_id`) — não tem cobrança/checkout integrado ainda. Enforcement desses limites (impedir criar a 4ª corretora no plano Starter, por exemplo) também não está implementado — é responsabilidade futura da camada de aplicação, não só do banco.

## Onboarding

**Objetivo de produto**: estratégia de *sunk cost* — o usuário investe alguns minutos configurando o sistema do jeito da corretora dele, e sente que "montou" algo seu, não que preencheu um formulário. Isso deveria aumentar a retenção.

**Gate de entrada**: ao clicar pra entrar numa conta em `/contas`, se a corretora associada tiver `onboarding_concluido = false`, redireciona pra `/onboarding/[corretoraId]` em vez do destino final (que ainda nem existe).

**As 5 etapas** (cada uma salva no banco ao avançar — se o usuário fechar o navegador no meio, retoma do ponto salvo, não do zero):
1. Dados da corretora (nome, CNPJ, registro SUSEP)
2. Ramos de atuação (chips multi-select, lista fixa no código)
3. Funil de vendas — começa de um modelo pronto (Prospecção/Renovações → Contato feito → Em negociação → Arquivado) que o usuário ajusta (renomear/reordenar/adicionar/remover etapas), nunca construção livre do zero
4. Escolha de plano
5. Revisão ("Tudo pronto") — mostra um preview do funil configurado antes de liberar o app

**Decisões de escopo pra não fazer over-engineering agora**:
- Sem tabela de template de fluxo (`fluxos_modelo`/`etapas_modelo`) — o modelo padrão da Etapa 3 é hardcoded no componente. Só vale criar uma tabela se um dia existir mais de um modelo pra escolher.
- Sem tabela `ramos` separada — lista fixa no código.
- Sem convite de equipe no onboarding — depende de `usuario_corretora`, que não existe.
- Sem upload de logo — exigiria configurar Supabase Storage, fora do escopo até ser pedido.

**Visual**: redesenhado em estilo Typeform a pedido do usuário — tela cheia, uma etapa por vez, barra de progresso fina no topo, tipografia grande, botão de "voltar" flutuante no canto (em vez do formulário longo tradicional num card centralizado, que foi a primeira versão implementada).

## Design system e MUI

Decisão: usar MUI (Material UI) pra ícones e componentes em geral, no projeto inteiro (não só telas novas) — incluindo migrar retroativamente `/auth` e `/contas`, que já estavam prontos com CSS/ícones feitos à mão (protótipos vindos do Claude Design).

- **Tema customizado**: em vez do visual padrão do Material Design, o tema do MUI (`app/ui/design/theme.ts`) usa as mesmas cores que já estavam definidas nos tokens CSS do projeto (`--primary`, `--accent`, etc.) — troca o "motor" dos componentes (acessibilidade, comportamento, consistência), mantém a identidade visual.
- `app/globals.css` hoje só guarda os tokens de cor como documentação/fonte de verdade pro tema — não estiliza nada diretamente, os componentes usam MUI + `sx` prop.
- `@mui/material-nextjs` (pacote oficial de integração MUI + App Router) foi adicionado — cuida da injeção de estilos do Emotion corretamente em SSR.
- Ícones vêm de `@mui/icons-material`. Exceção: o logo do Google (`GoogleG` em `app/ui/design/icons.tsx`) é SVG próprio, porque o MUI não inclui logos de marcas de terceiros.

### Cuidado com nomes de ícone do MUI
Vários nomes de ícone "outline" seguem o padrão `NomeOutlined` (ex: `WorkOutlined`, `MailOutlined`), **não** `NomeOutline`. Isso já causou alguns erros de import nesta sessão — vale checar a pasta `node_modules/@mui/icons-material` quando um ícone não for encontrado, em vez de adivinhar o nome.

## Pendências técnicas conhecidas

1. **`contas` sem policy de `UPDATE`** — `selecionarPlano` está quebrado (RLS bloqueia a troca de plano, silenciosamente, sem erro visível). Precisa de uma policy tipo:
   ```sql
   create policy "owner_pode_atualizar_sua_conta"
   on public.contas for update to authenticated
   using (owner_usuario_id = (select auth.uid()))
   with check (owner_usuario_id = (select auth.uid()));
   ```
2. **Tailwind não está de fato ativo** — falta `@import "tailwindcss";` em algum CSS carregado. Só afeta `app/page.tsx` (a página inicial padrão do `create-next-app`, não usada de verdade no fluxo real).
3. **`app/dashboard/page.tsx`** e **`app/ui/opportunities/table.tsx`** parecem ser rascunho/stub de outra pessoa (colega trabalhando em paralelo na navegação/sidebar) — não documentados, não mexer sem confirmar.
4. **`app/contatos`** (feature de contatos/CRM) ainda usa dados mockados (`placeholder_data.ts`), não foi migrada pro banco — é um trabalho anterior à integração com Supabase.
5. Faltam, na ordem de dependência do roadmap original: `cargos` + `modulos_sistema`, `usuario_corretora`, `usuario_conta_acesso_global`, domínio de seguros de verdade (`contatos` ligados a `corretoras`, `negociacoes`, `apolices`, `endossos`, `sinistros`), enforcement de limites de plano na aplicação.
