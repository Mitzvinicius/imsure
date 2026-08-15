---
name: fsd-architecture
description: Organização de pastas e regras de importação seguindo Feature-Sliced Design (FSD) — camadas App, Pages, Widgets, Features, Entities, Shared, fluxo unidirecional de dependências e API pública via index.ts. Use SEMPRE que estiver decidindo onde criar um novo arquivo/pasta em um projeto que segue FSD, criando uma nova feature ou componente, ou quando o usuário pedir para "organizar o código", "criar uma pasta para X", ou a estrutura do projeto parecer confusa/acoplada.
---

# Feature-Sliced Design (FSD)

## As camadas, de cima para baixo

```
app/        → configuração global, providers, rotas, estilos globais
pages/      → páginas compostas de widgets e features
widgets/    → composições autônomas de UI (combinam features + entities)
features/   → funcionalidades de valor de negócio interativas
entities/   → conceitos de domínio com estado/dados persistentes
shared/     → UI reutilizável, utilitários, clientes de API, sem regras de negócio
```

> **Nota:** a camada `processes/` (fluxos que cruzam várias páginas) existia na FSD v1, mas está **deprecada** na metodologia atual (feature-sliced.design a marca como obsoleta). Não crie essa camada em projetos novos — modele fluxos multi-página dentro de `pages/` ou `widgets/` compostos.

## A regra central (aplique sempre, sem exceção)

**Um módulo só pode importar de camadas estritamente abaixo dele na hierarquia.**

- `features/` pode importar de `entities/` e `shared/`. Não pode importar de outra `feature/`, nem de `widgets/`, `pages/` ou `app/`.
- `entities/` pode importar apenas de `shared/`.
- `shared/` não importa de nenhuma outra camada do projeto.
- `app/` e `shared/` são exceções especiais: cada uma é tanto camada quanto slice única, dividida diretamente em segmentos (`ui/`, `api/`, `model/`, `lib/`, `config/`).

Antes de escrever um `import`, pergunte: *a camada de origem está estritamente abaixo da camada de destino?* Se não estiver, o código está no lugar errado — mova-o, não force o import.

## API pública obrigatória

Cada slice (pasta de feature/entity/widget) expõe **um único ponto de entrada**: `index.ts`. Nenhum outro módulo do projeto pode importar um arquivo interno do slice diretamente.

```
features/
└── add-to-cart/
    ├── index.ts          ← único arquivo importável de fora
    ├── ui/
    │   └── AddToCartButton.tsx
    ├── model/
    │   └── useAddToCart.ts
    └── api/
        └── addToCartRequest.ts
```

```ts
// ❌ ERRADO — import profundo
import { useAddToCart } from '@/features/add-to-cart/model/useAddToCart';

// ✅ CORRETO — via API pública
import { AddToCartButton } from '@/features/add-to-cart';
```

## Checklist ao criar algo novo

1. É lógica de domínio com estado próprio (ex.: "Produto", "Usuário")? → `entities/`
2. É uma ação de valor direto para o usuário (ex.: "adicionar ao carrinho", "curtir post")? → `features/`
3. É uma composição de várias features/entities formando um bloco de UI autônomo (ex.: "cabeçalho com busca e carrinho")? → `widgets/`
4. É reutilizável, sem regra de negócio (botão genérico, formatador de data, cliente HTTP)? → `shared/`
5. É config global, provider de tema, definição de rota? → `app/`

Sempre crie o `index.ts` do slice junto com o primeiro arquivo — nunca deixe um slice sem API pública definida, mesmo que exporte só uma coisa por enquanto.
