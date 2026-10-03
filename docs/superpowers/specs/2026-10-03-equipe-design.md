# Módulo de Equipe (parte A) — usuários, cargos, permissões e carteira

> Status: aprovado em conversa, aguardando revisão do documento · 2026-10-03
> Parte B (tarefas, comentários, notificações): `2026-10-03-tarefas-design.md` — depende desta.

## Contexto e objetivo

Hoje só o dono da conta acessa qualquer coisa (`contas.owner_usuario_id`). O Mitz quer que as corretoras trabalhem em equipe e organizem tarefas, emissões e sinistros entre funcionários. Esta parte cria a equipe: convite, cargos com permissões, limite de usuários por plano e **carteira por produto** (cada negócio/apólice tem um responsável).

**Sucesso**: o administrador convida pessoas por link, define cargo e equipes; cada pessoa entra e vê exatamente o que o cargo permite — garantido no banco (RLS), não só na tela; produtores veem a própria carteira (ou a da equipe, se líderes) e sabem, sem detalhes, que o cliente tem produtos com colegas.

## Decisões tomadas (e por quê)

| Decisão | Motivo |
|---|---|
| **Limite por conta** (todas as corretoras somadas, pessoa conta uma vez), clientes do portal não contam | Simples de explicar; filiais não "cobram" a mesma pessoa duas vezes |
| **Starter 2 · Pro 5 · Business 15 usuários; extra R$ 24,90/mês** em todos os planos | Extra ≈ custo por usuário dos planos; degrau natural: Starter+2 extras ≈ Pro, Pro+10 extras ≈ Business |
| Contam: membros ativos + **convites pendentes**; não contam desativados | Evita convidar 20 pessoas de uma vez |
| Sem Stripe ainda: no limite, convite bloqueado com aviso de upgrade; `contas.usuarios_extras` já existe (= 0) | Compra do extra entra com o Stripe sem retrabalho |
| **Carteira por produto**: responsável no negócio e na apólice (não no contato) | O mesmo cliente pode ter auto com um produtor e vida com outro |
| **Equipes** opcionais com líder e ramos atendidos | Corretoras divididas por ramo (vida/RC vs auto/residencial); líder vê a carteira da equipe |
| Produtor **vê que o cliente tem produtos com colegas, sem detalhes** (ramo, status, responsável) | Evita oferta duplicada e incentiva indicação, sem expor a carteira |
| **5 cargos padrão**: Administrador, Gerente, Financeiro, Operacional, Produtor | Starter não tem cargo customizado; precisa de um conjunto fixo útil a todos |
| Cargos e permissões **como dados** (`cargos`, `cargo_permissoes`, catálogo `permissoes`) + escopo de visão | Cargos customizados (Pro/Business) viram só uma tela, sem reescrever RLS |
| **Convite por link copiável** (7 dias), sem e-mail automático por enquanto | Não depende de serviço de e-mail (limite baixo/spam do envio padrão do Supabase) |
| Pessoa pode estar em várias corretoras da conta com cargos diferentes | Gerente na matriz, produtor na filial |

## Cargos padrão

| Permissão / visão | Administrador | Gerente | Financeiro | Operacional | Produtor |
|---|---|---|---|---|---|
| Escopo de visão | tudo | tudo | tudo | tudo | própria (equipe se líder) |
| Negócios/apólices/sinistros: criar e editar | ✓ | ✓ | ✓ | ✓ | só os seus |
| Excluir negócio/apólice/sinistro (`negocios.excluir`, `apolices.excluir`, `sinistros.excluir`) | ✓ | ✓ | – | – | – |
| Transferir carteira / trocar responsável (`carteira.transferir`) | ✓ | ✓ | – | – | – |
| Baixa de parcelas (`parcelas.baixa`) | ✓ | ✓ | ✓ | ✓ | – |
| Ficha financeira e patrimônio do contato (`contatos.financeiro.ver`) | ✓ | ✓ | ✓ | ✓ | dos seus |
| Saúde do contato (`contatos.saude.ver`) | ✓ | – | – | ✓ | dos seus |
| Equipe: convidar, cargos, desativar (`equipe.membros`) | ✓ | – | – | – | – |
| Equipes e líderes (`equipe.equipes`) | ✓ | ✓ | – | – | – |
| Configurações da corretora (`configuracoes.editar`) | ✓ | – | ✓ | – | – |
| Plano e cobrança da conta (`plano.gerenciar`) | ✓ (+ dono) | – | ✓ | – | – |

- "Líder" não é cargo: é marcação em `equipe_membros`; o líder enxerga a carteira dos membros das suas equipes.
- `plano.gerenciar` afeta a **conta inteira** (todas as corretoras): o financeiro de qualquer corretora da conta pode trocar o plano.
- Saúde: só quem atua em sinistro/emissão de vida (Operacional) e o produtor do próprio cliente — minimização de acesso (LGPD).
- Produtor "dos seus" = contatos visíveis para ele (ver Regras de acesso).

## Modelo de dados

### Tabelas novas
- **`permissoes`** (global): `chave text pk`, `grupo`, `descricao`. Seed com as chaves da tabela acima. Leitura para autenticados.
- **`cargos`**: `id`, `corretora_id`, `nome`, `chave text null` (`administrador`/`gerente`/`financeiro`/`operacional`/`produtor` nos padrão), `escopo text check in ('tudo','equipe','propria')`, `padrao boolean`. Único `(corretora_id, nome)`, único parcial `(corretora_id, chave) where chave is not null`.
- **`cargo_permissoes`**: `cargo_id`, `permissao → permissoes.chave`; pk composta.
- **`usuario_corretora`**: `usuario_id → usuarios`, `corretora_id`, `cargo_id`, `ativo boolean default true`, `criado_em`; pk `(usuario_id, corretora_id)`; FK composta garantindo que o cargo é da mesma corretora.
- **`equipes`**: `id`, `corretora_id`, `nome`, `ramos text[]`; único `(corretora_id, nome)`.
- **`equipe_membros`**: `equipe_id`, `usuario_id`, `lider boolean`; pk composta; membro precisa estar em `usuario_corretora` da mesma corretora.
- **`convites`**: `id`, `corretora_id`, `email`, `cargo_id`, `token_hash` (SHA-256 do token; o token em claro só existe no link), `expira_em` (agora + 7 dias), `aceito_em`, `aceito_por`, `cancelado_em`, `criado_por`, `criado_em`. Único parcial `(corretora_id, lower(email)) where pendente`.

### Alterações
- `planos.limite_usuarios int` (2/5/15), `planos.preco_usuario_extra numeric(10,2)` (24,90).
- `contas.usuarios_extras int not null default 0`.
- `apolices.responsavel_usuario_id → usuarios` (not null após backfill): do vendedor do negócio de origem; senão quem cadastrou; renovação herda da apólice anterior.
- `contatos.criado_por_usuario_id → usuarios`.
- `negocios.vendedor_usuario_id`: passa a ser o responsável do negócio (já existe). Negócio de renovação herda o responsável da apólice (ajuste em `criar_negocios_renovacao`).

### Triggers / automações
- Ao criar corretora: cria os 5 cargos padrão com permissões e insere o dono da conta como Administrador.
- Backfill: cargos padrão em todas as corretoras existentes; dono de cada conta como Administrador em todas as suas corretoras; `responsavel_usuario_id`/`criado_por_usuario_id` = dono.

## Regras de acesso (RLS)

Funções `security definer`, `search_path=''`, executáveis só por `authenticated`:
- **`usuario_possui_corretora(corretora_id)`** → membro ativo (qualquer cargo). Hoje significa "é o dono"; redefinir mantém funcionando todas as policies que já a usam.
- **`usuario_pode(corretora_id, permissao)`** → o cargo do usuário tem a permissão.
- **`usuario_ve_responsavel(corretora_id, responsavel_id)`** → escopo `tudo`; ou `responsavel_id = uid`; ou uid é líder de equipe que contém `responsavel_id`.
- **`usuario_ve_contato(contato_id)`** → escopo `tudo`; ou criado por ele; ou existe negócio/apólice do contato com responsável visível.
- **`usuario_possui_apolice(apolice_id)`** reescrita → membro + `usuario_ve_responsavel` da apólice (todas as tabelas filhas de apólice herdam).
- **`produtos_do_contato_resumo(contato_id)`** → se `usuario_ve_contato`, devolve ramo, status e nome do responsável de **todas** as apólices/negócios do contato, sem outros campos.

| Tabela(s) | Leitura | Escrita |
|---|---|---|
| `corretoras`, `fluxos`, `etapas`, `seguradoras` | membro | `configuracoes.editar` (fluxos/etapas/corretora) |
| `contas` | dono ou membro de alguma corretora da conta | dono ou `plano.gerenciar` |
| `negocios` (+ `negocio_anexos`, `negocio_historico`, `negocio_anotacoes`) | membro + `usuario_ve_responsavel(vendedor)` | idem; excluir exige `negocios.excluir`; trocar vendedor exige `carteira.transferir` |
| `apolices` e filhas (parcelas, endossos, coberturas, bens_*, vidas, beneficiários, anexos) | `usuario_possui_apolice` | idem; excluir exige `apolices.excluir`; baixa de parcela exige `parcelas.baixa` (trigger/condição no update de status); trocar responsável exige `carteira.transferir` |
| `sinistros`, `sinistro_andamentos` | seguem a apólice | idem; excluir exige `sinistros.excluir` |
| `contatos`, `contato_vinculos` | `usuario_ve_contato` | idem |
| `contato_bens`, `contato_bem_apolices`, campos financeiros | `usuario_ve_contato` (+ `contatos.financeiro.ver` para escopo `tudo`) | idem |
| `contato_saude` | `usuario_ve_contato` **e** `contatos.saude.ver` | idem |
| `usuarios` | membros das mesmas corretoras | — (trigger) |
| `cargos`, `cargo_permissoes`, `usuario_corretora`, `equipes`, `equipe_membros` | membro | `equipe.membros` (membros/cargos), `equipe.equipes` (equipes) |
| `convites` | `equipe.membros` | via função `criar_convite` |

**Limite do plano** — função `criar_convite(corretora_id, email, cargo_id)` (security definer): exige `equipe.membros`; conta pessoas distintas ativas em `usuario_corretora` de todas as corretoras da conta + convites pendentes; recusa se `>= limite_usuarios + usuarios_extras`; gera token aleatório, guarda o hash, devolve o token. Aceite via `aceitar_convite(token)`: valida hash, validade, e-mail da sessão = e-mail do convite; cria `usuario_corretora` (ou reativa).

**Proteções**: não desativar/rebaixar o último Administrador da corretora; dono da conta é sempre Administrador e não pode ser desativado; desativado perde acesso imediatamente (funções consultam `ativo`).

## Telas

1. **`/corretoras/[id]/equipe`** (menu, para quem tem `equipe.*`), abas:
   - **Membros**: nome, e-mail, cargo, equipes, status; trocar cargo, desativar/reativar, **transferir carteira** (destino: outro membro; move negócios abertos e apólices do origem); contador "4 de 5 usuários do plano Pro". **Convidar** (e-mail + cargo) → link + **Copiar link** e texto pronto para WhatsApp; convites pendentes com cancelar e gerar novo link; no limite, botão bloqueado com aviso de upgrade.
   - **Equipes**: criar/renomear/excluir, membros, líder, ramos.
   - **Cargos**: leitura dos cargos padrão e permissões; aviso de cargos customizados (Pro/Business) em breve.
2. **`/convite/[token]`**: mostra quem convidou, corretora e cargo; entrar/criar conta (e-mail+senha ou Google); depois do login confere e-mail e aceita; convite expirado/cancelado/e-mail diferente → mensagem clara.
3. **Ajustes**: seletor de empresa e `/contas` listam corretoras onde é membro; menu esconde itens sem permissão; negócio ganha seletor de **vendedor** (quem tem `carteira.transferir`); apólice ganha **Responsável**; contato mostra "Também tem com colegas: …"; aba Saúde só com permissão; botões de excluir/baixa escondidos sem permissão; `criarNegocio`/`criarApolice` gravam responsável e `criado_por`.

## Erros e mensagens
Todas as actions no padrão `{ error }`. Recusas de RLS (`42501`) viram "Você não tem permissão para…". Limite: "Seu plano Pro permite 5 usuários (4 em uso + 1 convite pendente). Mude de plano para adicionar mais." Convite: "Este convite foi feito para outro e-mail" / "expirou" / "foi cancelado".

## Verificação
- **SQL**: `supabase/tests/equipe_rls.sql` com Administrador, Gerente, Financeiro, Operacional, Produtor A, Produtor B e um líder: cada linha da tabela de regras provada (ex.: Produtor A não lê apólice de B nem por id; líder lê da equipe; Gerente não lê `contato_saude`; Financeiro edita configurações; Operacional não exclui apólice; resumo de produtos de colegas sem campos extras).
- **SQL**: limite do plano (Starter com 2 membros recusa convite; convite pendente conta; desativado não conta; pessoa em 2 corretoras conta 1).
- **Vitest**: catálogo de permissões dos cargos padrão, texto do contador/limite, validação de convite (e-mail, expiração).
- **Navegador**: convidar → copiar link → aceitar com outra conta (o Mitz faz o login da segunda conta) → conferir menu/visão como produtor.
- Regressão: todos os testes SQL anteriores (`rls_seguros`, `renovacao`, `contato_vinculos`, `patrimonio_saude`) continuam passando.

## Fora de escopo
Tela de cargos customizados, acesso global de sócios (Business), cobrança do usuário extra (Stripe), atribuição automática por ramo da equipe, convite por e-mail automático, auditoria de acessos.
