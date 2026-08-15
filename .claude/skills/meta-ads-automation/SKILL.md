---
name: meta-ads-automation
description: Automação de campanhas do Meta Ads via MCP server ou CLI oficial (Meta Ads AI Connectors) — criação de campanhas/conjuntos/anúncios sempre em estado pausado, autenticação via Meta Business OAuth, e versionamento correto da Marketing API. Use SEMPRE que o usuário pedir para criar, editar ou automatizar campanhas, conjuntos de anúncios ou anúncios do Meta/Facebook/Instagram Ads via código ou agente de IA.
---

# Meta Ads: Automação via AI Connectors (MCP / CLI)

## Contexto do produto (confirmado, não é alucinação)

A Meta lançou oficialmente, em **29 de abril de 2026**, em beta aberto, os **"Meta Ads AI Connectors"**: duas interfaces para a Marketing API pensadas para agentes de IA — um **servidor MCP** (`mcp.facebook.com/ads`) e uma **CLI**. Autenticação é feita via **Meta Business OAuth**, sem necessidade de criar um Developer App tradicional nem passar por App Review.

> ⚠️ **Correção de versão:** a Marketing API usa numeração `vXX.0` — não existe "v25.03". A versão vigente na época do lançamento dos Connectors era a **v25.0** (18/02/2026); desde **29/07/2026** a versão mais recente é a **v26.0**. Sempre confirme a versão atual na documentação oficial (`developers.facebook.com`) antes de fixar um número no código — a Meta depreca versões antigas em janelas de poucos meses.

## Regra central: tudo nasce pausado (via MCP)

A documentação oficial do MCP server confirma explicitamente: ferramentas de escrita (`ads_create_campaign`, `ads_create_ad_set`, `ads_create_ad`) **criam a entidade em estado pausado**, e o cliente de IA precisa pedir confirmação explícita antes de ativação. Trate isso como uma rede de segurança intencional — **nunca escreva código que ative uma campanha automaticamente logo após criá-la** sem uma confirmação humana explícita no fluxo.

```
1. Criar campanha/conjunto/anúncio  → nasce PAUSADO (garantido pelo MCP)
2. Apresentar resumo ao usuário     → nome, orçamento, segmentação, criativo
3. Aguardar confirmação explícita   → "sim, ativar" / "não, ajustar X"
4. Só então mudar status para ACTIVE
```

**Nota sobre a CLI:** ao contrário do MCP, a documentação oficial da CLI não deixa 100% explícito se o comportamento padrão também é "sempre pausado" — trate como não confirmado e, por segurança, **force explicitamente o status `PAUSED` na criação** independentemente da ferramenta usada, até validar o comportamento padrão na versão específica que você está usando.

## Estrutura de ferramentas disponíveis

A documentação oficial organiza as ferramentas em categorias (o conjunto está em expansão contínua — não assuma um número fixo de ferramentas):

- **Reporting** — métricas de campanhas, conjuntos e anúncios
- **Criação/gestão de anúncios** — criar/editar campanha, ad set, ad (sempre pausado)
- **Catálogo** — produtos para catalog ads
- **Sinais/datasets** — eventos de conversão, públicos customizados
- **Ajuda/troubleshooting** — diagnóstico de rejeições e problemas de entrega
- **Testes A/B e lift studies**
- **Logs de atividade**

Não assuma nomes exatos de ferramentas sem checar a versão instalada — a superfície evolui rapidamente por estar em beta aberto.

## Checklist antes de escrever código de automação

1. Confirmei a versão atual da Marketing API na documentação oficial (não fixei um número "de memória")?
2. O fluxo força confirmação humana antes de qualquer `ACTIVE`?
3. As credenciais de OAuth do Business estão em variável de ambiente, nunca hardcoded?
4. Existe log/auditoria de toda entidade criada (campanha, ad set, ad) com timestamp e quem/o que disparou a criação?
5. Se estou usando a CLI (não o MCP), estou passando `--status PAUSED` explicitamente por segurança?
