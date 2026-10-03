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

## Migração de contatos pro banco

A feature de contatos existia antes da integração com Supabase, usando um array mockado (`placeholder_data.ts`, com campos em inglês: `name`, `phone`, `situation`...). Migrada pra uma tabela `contatos` de verdade, escopada por `corretora_id`, com RLS no mesmo padrão de `fluxos`/`etapas` (posse via cadeia de FKs até `contas.owner_usuario_id`). Os 10 contatos mockados viraram um seed real no banco.

Os nomes de campo viraram português (`nome`, `telefone`, `situacao`...) pra ficar consistente com o resto do schema — isso quebrou o `type Contact` antigo, que foi atualizado junto.

## Tela de Funis (negócios/oportunidades)

Construída a partir de um protótipo do Claude Design (`Funil de Vendas.html` + `app.jsx`/`components.jsx`/`data.jsx`/`deal-detail.jsx`/`views.jsx`). Kanban + Lista, com uma tabela `negocios` real (não é estado local/mock) ligada a `etapas` (do funil configurado no onboarding), `contatos` e `usuarios` (vendedor).

### Diferenças deliberadas em relação ao protótipo do Claude Design
O protótipo tem um painel de "Tweaks" (`tweaks-panel.jsx`) — isso é uma ferramenta do **próprio Claude Design** pra ajustar densidade/estilo/cantos ao vivo enquanto se olha o protótipo, não é feature de produto. Não foi portado. Além disso:
- Sidebar reduzida a só as rotas que existem (`Funis`, `Contatos`) + um seletor de conta/corretora (dropdown), em vez dos ~10 itens de navegação do protótipo (a maioria não tem rota ainda).
- Vendedor **é mostrado de verdade** no card (avatar + nome), não removido — decisão explícita do usuário: "não estamos desenvolvendo um sistema mono usuário". Isso exigiu abrir uma policy de `SELECT` em `usuarios`, escopada a "vendedores de negócios que eu possuo" (ver seção de RLS).
- Etapas do funil são as que o usuário configurou no onboarding (dinâmicas), não as 4 fixas do protótipo — e não existe o bucket especial "fechado" escondido da lista de colunas do protótipo.
- "Ramo" nos formulários usa `corretora.ramos_atuacao` (escolhido no onboarding) em vez de uma lista fixa — reaproveita uma decisão que o usuário já tinha tomado.

### Filtros avançados
Popover com cliente/tipo/ramo/seguradora/criado-a-partir-de, igual o protótipo — **exceto** o campo "cotação válida até" do protótipo, que não tem campo correspondente no nosso schema (não implementado).

### Detalhe do negócio: state de página, não modal
Decisão explícita do usuário: o detalhe do negócio (`DealDetail.tsx`) **substitui** o conteúdo principal da página (igual o comportamento real do HTML do Claude Design — `selectedDeal ? <DealDetail/> : <KanbanView/>`), controlado por **search param na URL** (`?negocio=<id>`), não por um `Dialog`/modal. Isso permite compartilhar o link direto de um negócio com outra pessoa que tenha acesso à mesma corretora (útil quando `usuario_corretora` existir).

A edição de dados do **contato** (nome/e-mail/telefone/CPF-CNPJ/profissão) acontece **direto na tela do negócio**, não só em `/contatos` — decisão explícita: evita trocar de página pra correções básicas, e serve como confirmação visual de que o negócio está vinculado à pessoa certa. `atualizarContato` e `atualizarNegocio` são chamados juntos (`Promise.all`) no botão Salvar.

### Vendedor sempre = usuário logado (por enquanto)
Criar um negócio sempre atribui `vendedor_usuario_id = auth.uid()` — não existe seletor de vendedor no formulário, porque hoje só o dono acessa a corretora. Isso é uma limitação temporária, não uma decisão de produto: o campo/coluna já existe pensando em quando `usuario_corretora` for implementado.

## Contato: pessoa física ou jurídica, e máscaras de formulário

`contatos.cpf_cnpj` é **um campo só** pra CPF ou CNPJ (não dois campos separados) — decisão do usuário: "o contato pode ser uma empresa também [...] é mais eficiente manter um campo pros dois". A detecção de tipo é automática pela quantidade de dígitos digitados (≤11 = CPF/pessoa física, >11 = CNPJ/pessoa jurídica), e o resultado fica salvo em `contatos.tipo_pessoa` (`'fisica' | 'juridica'`).

**Unicidade**: `unique (corretora_id, cpf_cnpj)` no banco — não é só validação de tela. Postgres permite múltiplos `NULL` numa coluna com `unique` (CPF/CNPJ é opcional), então isso não bloqueia contatos sem documento. A Server Action (`criarNegocio` com `novoContato`, e `atualizarContato`) captura o código de erro `23505` (unique_violation) do Postgres e devolve uma mensagem amigável em vez do erro cru.

**Máscaras** (`app/corretoras/[corretoraId]/funis/masks.ts`, funções puras sem dependência externa): telefone formata `(XX) XXXXX-XXXX` (adivinha celular vs. fixo pela quantidade de dígitos), CPF/CNPJ formata e troca de máscara sozinho ao ultrapassar 11 dígitos, e-mail valida formato (mesmo regex usado nas telas de auth).

**Por que isso virou pauta**: sem restrição nenhuma nesses campos, texto colado/ditado por voz (aparentemente Windows Voice Typing, que insere `+` entre grupos de números reconhecidos) ia direto pro banco sem filtro — bug relatado pelo usuário com print mostrando algo como `65041+948+96206+149+8040` no campo de telefone.

**Pendente**: validação do dígito verificador real de CPF/CNPJ (hoje só confere se tem 11 ou 14 dígitos) — perguntado ao usuário, sem resposta ainda.

## Base de seguros (etapa 1 do portal do cliente)

Spec completo: [`superpowers/specs/2026-10-02-base-seguros-design.md`](superpowers/specs/2026-10-02-base-seguros-design.md). O objetivo maior é um portal onde o segurado vê apólices/sinistros em todas as corretoras onde está cadastrado; esta etapa cria os dados que o portal vai mostrar.

- **Cadastro manual agora, PDF depois**: o formulário é o mesmo que a extração de PDF vai preencher.
- **Bem segurado com uma tabela por ramo** (auto, residencial, RC, vida + beneficiários) e descrição livre para os demais: validação no banco, busca por placa/chassi, mesmo padrão de RLS do resto.
- **Apólice não é "endosso 0"**: parcela pertence à apólice e opcionalmente a um endosso — o extrato de comissão não traz número de endosso para parcelas originais, então um "endosso 0" geraria falsos desencontros na baixa (decisão do Mitz).
- **Status da parcela virá da baixa de comissão** (etapa 1b); baixa manual existe como alternativa, e baixa vinda de extrato não pode ser desfeita à mão.
- **Seguradoras numa lista global** mantida pelo imsure: telefones de assistência prontos para o portal e identificação consistente para cruzar extratos.
- **Franquia por cobertura**, não por apólice.
- **Sinistro com status por ramo** (auto tem vistoria/oficina) e **histórico de andamentos** para todos — é o "rastreio" que o cliente vai ver.
- **Renovação automática** cria negócio X dias antes do fim da vigência (X por corretora), na etapa marcada como de renovação (`etapas.renovacao`, não pelo nome — renomear não quebra). Índice único em `negocios.apolice_renovada_id` impede duplicar.
- **Status da apólice é calculado em TS**, não guardado: só o cancelamento é manual.

## Status do negócio e máscaras (pedidos do Mitz após testar a etapa 1)

- **Ganho é automático, perdido é manual**: emitir apólice marca o negócio como Ganho e o move para a etapa marcada como "de emissão" (`etapas.emissao`, mesmo esquema da renovação — por marcação, não por nome). Perdido exige motivo de uma lista fixa (`MOTIVOS_PERDA`) + observação opcional; "Arquivado" continua sendo só uma etapa. O funil padrão do onboarding ganhou "Seguro emitido".
- **Máscara de dinheiro "da direita para a esquerda"** (como app de banco): digitar 123456 vira R$ 1.234,56. Evita de vez o bug de vírgula/centavos. Percentual igual, limitado a 100%.

## Ficha do contato e vínculos familiares

- **Todo parente é um contato da corretora** (vincular existente ou cadastrar novo com nome + telefone ou e-mail): o parente pode ter as próprias apólices e virar oportunidade de venda.
- **Vínculo automático nos dois lados** (decisão do Mitz): grava-se uma linha só e o outro contato vê o grau inverso (filho ↔ pai/mãe, avô ↔ neto, sogro ↔ genro/nora, enteado ↔ padrasto/madrasta; cônjuge, irmão e cunhado são simétricos). Graus neutros em gênero ("Pai/Mãe") para não precisar de gênero do contato.
- **Pessoa jurídica** mostra só as informações principais; estado civil, financeiro e família são de pessoa física (a action limpa esses campos se o contato virar PJ).
- **Patrimônio imobilizado** = imóveis, veículos e outros bens; **financeiro** = investimentos e aplicações.

## Ficha do contato em abas, patrimônio e saúde

- **Patrimônio imobilizado virou lista de bens** (imóvel, veículo, outro) com valor estimado; o total é a soma. Cada bem mostra se está **Segurado**, com **Seguro vencido** ou **Sem seguro** — oportunidade de venda visível na ficha.
- **Vínculo bem ↔ apólice é manual** (decisão do Mitz), muitos-para-muitos (renovações e frotas), só ramos automóvel, residencial e empresarial. Ligar automaticamente pela placa/endereço ao cadastrar a apólice ficou para depois, se fizer sentido.
- **Saúde em tabela própria** (`contato_saude`): é dado sensível pela LGPD e, quando houver equipe, vai ser preciso restringir quem vê. IMC calculado no código (faixas da OMS), não guardado.

## Equipe, cargos e permissões

Spec: [`superpowers/specs/2026-10-03-equipe-design.md`](superpowers/specs/2026-10-03-equipe-design.md).

- **Limite de usuários por conta** (pessoa conta uma vez, mesmo em várias corretoras): Starter 2 · Pro 5 · Business 15, extra R$ 24,90. O extra ≈ custo por usuário dos planos, o que cria degrau natural (Starter + 2 extras ≈ Pro; Pro + 10 extras ≈ Business). Convite pendente conta; desativado não. Sem Stripe ainda: no limite, o convite é bloqueado (no banco, em `criar_convite`).
- **Carteira por produto, não por cliente**: o mesmo cliente pode ter auto com um produtor e vida com outro. Produtor vê a própria carteira e **sabe, sem detalhes**, que o cliente tem produtos com colegas (evita oferta duplicada sem expor a carteira).
- **Equipes opcionais** com líder (marcação, não cargo) e ramos atendidos — para corretoras divididas por ramo.
- **5 cargos padrão** (Administrador, Gerente, Financeiro, Operacional, Produtor). Gerente e Financeiro **não veem saúde** (LGPD: só quem atua em sinistro/emissão de vida e o produtor do próprio cliente). Financeiro edita configurações e plano (o plano vale para a conta inteira).
- **Cargos como dados** (`cargos` + `cargo_permissoes`) com escopo de visão: cargos personalizados (Pro/Business) viram só uma tela, sem reescrever RLS.
- **Convite por link copiável** (7 dias, token só no link, banco guarda hash): não depende de envio de e-mail (limite baixo/spam do envio padrão).
- Corrigiu de quebra o `selecionarPlano` (faltava policy de UPDATE em `contas`).

## Contatos compartilhados na corretora

Depois do teste com a segunda conta, o Mitz pediu que **todos vejam todos os contatos da corretora**, mas só os próprios negócios: sem isso o produtor cadastrava o cliente em duplicidade (ou batia no "CPF já cadastrado" sem conseguir achar o contato).
- Fora da carteira: vê dados principais e o resumo "também tem com colegas"; **corrige só telefone e e-mail** (decisão do Mitz) — garantido por trigger no banco.
- Financeiro, patrimônio, família e saúde continuam só para a carteira. Renda e patrimônio financeiro saíram de `contatos` para `contato_financeiro`, porque RLS não esconde colunas por linha.
- Ao criar negócio/apólice com o contato, ele entra na carteira do produtor e a ficha completa libera.

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
4. **CPF/CNPJ sem validação de dígito verificador** — só confere quantidade de dígitos (11/14), não o cálculo real de validade. Perguntado ao usuário se vale a pena implementar.
5. **Filtro "cotação válida até"** do protótipo do funil não foi implementado — sem campo correspondente no schema.
6. **Turbopack (dev) pode travar** com "Jest worker encountered N child process exceptions" depois de muitas mudanças de arquivos/pastas de uma vez — não é bug de código (build de produção sempre passou limpo nessas ocasiões), é cache do dev server ficando inconsistente. Resolve com `rm -rf .next` + reiniciar `npm run dev`.
7. Faltam, na ordem de dependência do roadmap original: `cargos` + `modulos_sistema`, `usuario_corretora`, `usuario_conta_acesso_global`, resto do domínio de seguros (`apolices`, `endossos`, `sinistros` — `contatos` e `negocios` já existem), enforcement de limites de plano na aplicação.
