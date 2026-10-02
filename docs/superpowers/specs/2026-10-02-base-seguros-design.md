# Etapa 1 — Base de seguros no CRM (apólices, endossos, parcelas, sinistros)

> Status: aprovado em conversa, aguardando revisão do documento · 2026-10-02

## Contexto e objetivo

O objetivo maior é um **portal do cliente da corretora** dentro do imsure (PWA), com duas óticas:

- **Cliente (segurado)**: consultar apólices, dados e sinistros; avisar sinistro e pedir assistência pelo app.
- **Corretora**: avisar vencimento de boletos, enviar promoções, avisar renovação.

Hoje o imsure só guarda `contatos` e `negocios` (funil de venda interno) — não existe nada do domínio de seguros que o cliente queira ver. Por isso o trabalho foi decomposto em etapas, cada uma com spec/plano próprios:

| # | Etapa | Depende de |
|---|---|---|
| **1** | **Base de seguros no CRM** (este documento) | — |
| 1b | Baixa de comissão: importa extrato (Excel, depois PDF), cruza com parcelas, dá baixa, lista de pendências | 1 |
| 2 | Portal do cliente (consulta) + PWA | 1, validação de CPF/CNPJ |
| 3 | Ações do cliente: aviso de sinistro, assistência (direto com a seguradora ou via corretor, se a corretora oferecer) | 2 |
| 4 | Comunicação da corretora: lembrete de boleto, renovação, promoções | 1, 2 |

**Sucesso da etapa 1**: a corretora consegue cadastrar sua carteira (apólices com bem segurado, coberturas, parcelas e endossos), registrar e acompanhar sinistros, emitir apólice a partir de um negócio ganho, e receber automaticamente no funil os negócios de renovação. O modelo já fica pronto para a 1b (baixa de comissão), para a 2 (cliente lendo os próprios dados em várias corretoras) e para extração de PDF no futuro.

## Decisões tomadas (e por quê)

| Decisão | Motivo |
|---|---|
| Cadastro **manual** de apólices agora; modelo pronto para extração de PDF depois | Começa simples; o formulário é o mesmo que a extração vai preencher |
| Bem segurado: **campos estruturados** para auto, residencial, vida e RC; **descrição livre** para os demais ramos | Estrutura onde importa (busca por placa, beneficiários), sem travar ramos raros |
| **Uma tabela por ramo** (`bens_auto`, `bens_residencial`, `bens_rc`, `vidas_seguradas` + `beneficiarios`) | Segue o padrão do projeto (tabelas tipadas, RLS pela cadeia de FKs); validação no banco, não no código |
| Parcela guarda boleto (linha digitável, PIX, PDF); status atualizado pela **baixa de comissão** (1b), com baixa manual como alternativa | Segunda via de boleto é o pedido mais comum; a fonte confiável de "pago" é o extrato de comissão |
| Forma de pagamento **por apólice** (boleto, cartão, débito em conta) | Campos de boleto só aparecem quando a forma é boleto |
| **Endossos na etapa 1**, com parcelas e coberturas próprias | Endosso é rotina e afeta a chave do cruzamento da baixa |
| **A apólice não é "endosso 0"** — parcela pertence à apólice e opcionalmente a um endosso | O extrato de comissão não traz número de endosso para parcelas da apólice original; um "endosso 0" no sistema geraria falso desencontro |
| Negócio ganho → **Emitir apólice** pré-preenchida; também existe **cadastro direto** | Liga venda à carteira, e permite importar a carteira existente |
| **Renovação automática**: negócio criado X dias antes do fim da vigência, X configurável por corretora, na etapa marcada como "de renovação" | Renovação é a receita recorrente; marcação em vez de nome evita quebra se a etapa for renomeada |
| **Seguradoras numa lista global** mantida pelo imsure | Telefones de assistência/sinistro prontos pra etapa 3; identificação consistente pra baixa de comissão |
| Franquia **por cobertura** | Na prática a franquia varia por cobertura (ex.: só casco no auto) |
| Sinistro com **status por ramo** + **histórico de andamentos** para todos | Auto tem vistoria/oficina; RC vira processo longo; o histórico é o que o cliente vai acompanhar no portal |

## Modelo de dados

Convenções do projeto mantidas: nomes em português, `id uuid default gen_random_uuid()`, `criado_em timestamptz default now()`, campos de domínio fechado como `text` + `check`.

### Alterações em tabelas existentes

- `corretoras.dias_antecedencia_renovacao integer not null default 60 check (> 0 and <= 365)`
- `etapas.renovacao boolean not null default false` — no máximo uma etapa marcada por fluxo (índice único parcial em `fluxo_id where renovacao`).
  - Migração: marca a etapa chamada `Renovações` (sem diferenciar maiúsculas/acentos) de cada fluxo, se existir.
  - Onboarding (`salvarFluxoVendas`): passa a marcar a etapa "Renovações" do modelo padrão.
- `negocios.apolice_renovada_id uuid null references apolices on delete set null` — **único** quando não nulo; é a garantia de que a rotina de renovação nunca duplica.

### Tabelas novas

**`seguradoras`** (global, sem `corretora_id`)
- `nome text not null unique`, `codigo_susep text unique`, `telefone_assistencia text`, `telefone_sinistro text`, `ativa boolean default true`
- Seed inicial com as principais seguradoras do mercado.

**`apolices`**
- `corretora_id` → `corretoras`, `contato_id` → `contatos` (o cliente), `seguradora_id` → `seguradoras`
- `ramo text not null` (mesma lista de `corretoras.ramos_atuacao`)
- `numero text not null`, `inicio_vigencia date not null`, `fim_vigencia date not null` (`check fim > inicio`)
- `premio numeric(12,2)`, `percentual_comissao numeric(5,2)`
- `forma_pagamento text not null check in ('boleto','cartao','debito')`
- `cancelada_em date null` (único status manual)
- `descricao_bem text null` (para ramos sem tabela própria)
- `negocio_origem_id` → `negocios` (null no cadastro direto; único quando não nulo), `apolice_anterior_id` → `apolices` (null se não for renovação)
- **Único**: `(seguradora_id, numero)` — base do cruzamento da baixa de comissão
- **Status é derivado, não armazenado** (view `apolices_com_status` ou função): `cancelada` se `cancelada_em`; senão `renovada` se existe apólice com `apolice_anterior_id = id`; senão `vencida` se `fim_vigencia < hoje`; senão `vigente`.

**`endossos`**
- `apolice_id`, `numero text not null`, `tipo text not null check in ('alteracao_bem','inclusao','exclusao','alteracao_cobertura','cancelamento','outro')`, `data_emissao date`, `descricao text`, `valor numeric(12,2)` (pode ser negativo — restituição)
- **Único**: `(apolice_id, numero)`

**`parcelas`**
- `apolice_id not null`, `endosso_id null` (null = parcela da apólice)
- `numero integer not null`, `vencimento date not null`, `valor numeric(12,2) not null`, `comissao_esperada numeric(12,2)`
- `status text not null default 'aberta' check in ('aberta','paga','comissao_recebida')`
- `baixa_origem text null check in ('manual','extrato')`, `baixa_em timestamptz`, `baixa_referencia text` (id do extrato na 1b)
- `linha_digitavel text`, `pix_copia_cola text`
- **Únicos parciais**: `(apolice_id, numero) where endosso_id is null` e `(endosso_id, numero) where endosso_id is not null`
- **Regra de cruzamento (contrato para a 1b)**: linha do extrato sem endosso → `apolice + numero` com `endosso_id is null`; com endosso → `apolice + endosso + numero`; sem correspondência → pendência.

**`coberturas`**
- `apolice_id not null`, `endosso_id null`, `nome text not null`, `importancia_segurada numeric(14,2)`, `franquia numeric(12,2)` (null = sem franquia)

**Bens segurados** (todas com `apolice_id not null`)
- `bens_auto`: `placa`, `chassi`, `marca`, `modelo`, `ano_fabricacao int`, `ano_modelo int`, `cep_pernoite`. Índices em `placa` e `chassi`.
- `bens_residencial`: `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `tipo_imovel text check in ('casa','apartamento','condominio','outro')`
- `bens_rc`: `atividade text not null`, `limite numeric(14,2)`
- `vidas_seguradas`: `nome not null`, `cpf`, `data_nascimento date`
- `beneficiarios`: `vida_segurada_id not null`, `nome not null`, `parentesco`, `percentual numeric(5,2) not null check (> 0 and <= 100)`

**`sinistros`**
- `apolice_id not null`, `bem_auto_id null`, `bem_residencial_id null` (qual bem, quando a apólice tem mais de um)
- `data_ocorrencia date not null`, `tipo text not null` (lista por ramo, no código), `descricao text`
- `numero_seguradora text`, `status text not null default 'aberto'`, `valor_indenizacao numeric(12,2)`
- Status base: `aberto → em_analise → documentacao_pendente → aprovado | negado → indenizado → encerrado`
- Auto acrescenta `vistoria` e `em_oficina` (entre `em_analise` e `aprovado`). Lista válida por ramo validada no código e na action.

**`sinistro_andamentos`**
- `sinistro_id not null`, `data timestamptz default now()`, `descricao text not null`, `status_novo text null`, `numero_processo text null`, `usuario_id`, `usuario_nome` (mesmo padrão de `negocio_historico`)

**`apolice_anexos`**
- `apolice_id not null`, `endosso_id null`, `parcela_id null`, `sinistro_id null`, `sinistro_andamento_id null`
- `nome_arquivo`, `caminho_storage`, `tamanho_bytes`, `tipo_mime`, `usuario_id`, `usuario_nome` (mesmo padrão de `negocio_anexos`)
- Bucket privado novo `apolice-anexos` (mesmo padrão do `negocio-anexos`), caminho `corretora_id/apolice_id/arquivo`.

### RLS

- Todas as tabelas com `corretora_id` ou filhas de `apolices`: policies de `select/insert/update/delete` no padrão atual — posse via cadeia de FKs até `contas.owner_usuario_id = (select auth.uid())`. Índices em todas as FKs usadas nas policies.
- `seguradoras`: `select` para qualquer usuário autenticado; sem policy de escrita (só migração/admin).
- Storage `apolice-anexos`: policies por prefixo `corretora_id` resolvendo posse da corretora.
- **Etapa 2** acrescentará policies de leitura para o cliente final (ligado por CPF/CNPJ verificado), sem nunca expor `comissao_esperada`/`percentual_comissao` — por isso as views de leitura do cliente serão separadas. Nada disso entra agora.

### Renovação automática

- Função SQL `criar_negocios_renovacao()` (`security definer`), agendada diariamente via `pg_cron` (extensão disponível, a habilitar).
- Seleciona apólices `vigente` com `fim_vigencia - corretora.dias_antecedencia_renovacao <= hoje` e sem negócio com `apolice_renovada_id = apolice.id`.
- Cria `negocios` com: `contato_id` e `ramo` da apólice, `tipo = 'Renovação'`, `seguradora` = nome da seguradora, `etapa_id` = etapa `renovacao = true` do fluxo ativo (fallback: primeira etapa por `ordem`), `vendedor_usuario_id` = vendedor do negócio de origem (fallback: dono da conta), `valor` = prêmio atual.
- Idempotente pelo índice único em `negocios.apolice_renovada_id` (`on conflict do nothing`).
- Ao emitir apólice a partir de um negócio de renovação, a nova apólice recebe `apolice_anterior_id` = `apolice_renovada_id` do negócio.

## Telas e fluxos

Padrão do projeto: `page.tsx` (Server Component, guarda + dados) + `NomeDaPagina.tsx` (Client). Sidebar ganha **Apólices** e **Sinistros**.

1. **`/corretoras/[id]/apolices`** — DataGrid: cliente, seguradora, ramo, número, vigência, status, próxima parcela. Filtros: ramo, seguradora, status, "vence em até X dias". Busca: cliente, número, placa, chassi. Botão **Nova apólice**.
2. **`/corretoras/[id]/apolices/nova`** e edição — página (não modal):
   - Dados gerais (busca/cria contato reaproveitando `buscarContatos`/fluxo do `NewDealModal`; seguradora via autocomplete da lista global)
   - Bem segurado: formulário muda pelo ramo (auto / residencial / vida com beneficiários / RC / descrição livre)
   - Coberturas: lista editável (nome, importância segurada, franquia)
   - Parcelas: "Gerar parcelas" (quantidade + 1º vencimento → valores iguais, último absorve centavos) com ajuste manual; campos de boleto quando `forma_pagamento = 'boleto'`
   - Aviso (não bloqueia) quando soma das parcelas ≠ prêmio
3. **`/corretoras/[id]/apolices/[apoliceId]`** — abas Resumo · Parcelas · Endossos · Sinistros · Anexos. Endosso novo com parcelas/coberturas próprias. Baixa manual de parcela. Links para negócio de origem e apólice anterior/seguinte.
4. **Funil** — no `DealDetail`, botão **Emitir apólice** disponível em qualquer etapa (o funil padrão termina em "Arquivado", que é negócio perdido — então "última etapa" não significa ganho); abre o cadastro pré-preenchido (contato, ramo, seguradora pelo nome, prêmio = valor) e, ao salvar, preenche `negocios.fechado_em` se estiver vazio. Um negócio pode originar no máximo uma apólice. Negócio de renovação mostra link para a apólice que renova.
5. **`/corretoras/[id]/sinistros`** — lista com filtro por status/ramo; detalhe com dados, stepper de status do ramo, linha do tempo de andamentos (com anexos) e "Registrar andamento". Abrir sinistro pela lista ou pela aba da apólice.
6. **`/corretoras/[id]/configuracoes`** (primeira tela de configurações) — dias de antecedência da renovação e qual etapa é a de renovação; aviso se nenhuma estiver marcada.

## Server Actions

Em `app/lib/` (arquivo novo `actions-seguros.ts` para não inchar `actions.ts`), todas no padrão `{ error: string | null }`, sem `redirect()`:
`criarApolice`, `atualizarApolice`, `cancelarApolice`, `criarEndosso`, `gerarParcelas`, `atualizarParcela`, `darBaixaManual`, `salvarCoberturas`, `salvarBemSegurado`, `criarSinistro`, `registrarAndamento` (muda status junto, se informado), `enviarAnexoApolice`, `atualizarConfiguracoesCorretora`.

Erros do Postgres traduzidos para mensagem amigável (mesmo padrão de `mensagemErroContato`): `23505` em `(seguradora_id, numero)` → "Já existe uma apólice com esse número nessa seguradora".

## Regras de negócio

- Número da apólice único por seguradora (banco).
- `fim_vigencia > inicio_vigencia` (banco).
- Soma das parcelas ≠ prêmio → aviso, não erro.
- Beneficiários de uma vida somam exatamente 100% (validado na action ao salvar o conjunto).
- Status da apólice derivado; só cancelamento é manual.
- Mudança de status do sinistro só via `registrarAndamento` → sempre deixa rastro.
- Status de sinistro precisa pertencer à lista do ramo.
- Renovação nunca duplica (índice único).

## Verificação

- **Testes**: configurar Vitest (não existe suíte hoje) para lógica pura extraída em funções: geração de parcelas, cálculo de status da apólice, validação de beneficiários, transições de status de sinistro por ramo.
- **RLS**: script SQL que cria dois usuários/contas e prova que um não lê/escreve apólices, parcelas, sinistros e anexos do outro; `get_advisors` de segurança sem alertas novos.
- **Renovação**: rodar `criar_negocios_renovacao()` duas vezes seguidas e confirmar um único negócio por apólice.
- **Navegador**: percorrer cadastro completo (auto com coberturas e parcelas), endosso, sinistro com andamentos, emissão a partir de negócio, configurações.
- `pnpm build` e `pnpm lint` limpos.

## Fora de escopo

Baixa de comissão (1b), portal do cliente e PWA (2), ações do cliente (3), comunicação/promoções (4), extração de PDF, dígito verificador de CPF/CNPJ (pré-requisito da 2), migrar `negocios.seguradora` de texto para `seguradora_id`, multiusuário (`usuario_corretora`), correção do `selecionarPlano`.
