---
name: nextjs-app-router
description: Padrões de arquitetura para Next.js App Router — Server Components vs Client Components, RSC Payload, fronteira 'use client', e composição via slots (children). Use SEMPRE que estiver criando páginas, layouts, componentes ou decidindo onde colocar lógica de dados em um projeto Next.js com App Router, mesmo que o usuário não mencione "server component" ou "RSC" explicitamente — por exemplo, ao pedir "cria a página de dashboard", "esse componente precisa de estado", ou "busca os dados do banco aqui".
---

# Next.js App Router: Server/Client Components

## Regra central (não-negociável)

No App Router, **todo componente é Server Component por padrão**. Só vira Client Component se o arquivo começar com `'use client'`. Ao decidir onde colocar um pedaço de código, pergunte primeiro: *isso precisa de interatividade no navegador?* Se não precisar, é Server Component — sem exceção "por garantia".

| Precisa de... | Use |
|---|---|
| Acesso direto a DB/SDKs backend, segredos de API | Server Component |
| `useState`, `useReducer`, `useEffect` | Client Component |
| APIs do navegador (`window`, `localStorage`) | Client Component |
| `async/await` nativo no corpo do componente | Server Component |
| Zero JS enviado ao bundle | Server Component |

## Regras de composição

1. **Client Components ficam nas folhas da árvore.** Não marque uma página inteira ou um layout como `'use client'` só porque um botão lá dentro precisa de `onClick`. Isole o botão.
2. **`'use client'` "contamina" o grafo de importação.** Todo arquivo importado diretamente por um arquivo `'use client'` também vira parte do bundle do cliente. Verifique o que você está importando antes de marcar um arquivo.
3. **Nunca importe um Server Component dentro de um Client Component.** Isso não funciona — Server Components não podem ser importados no client bundle.
4. **Para renderizar um Server Component "dentro" da árvore de um Client Component**, use o padrão de slots: passe o Server Component como `children` (ou outra prop) vindo de um Server Component pai. O Client Component nunca importa o Server Component — ele só recebe o resultado já renderizado.

```tsx
// ❌ ERRADO: importar Server Component dentro de Client Component
'use client';
import { ServerWidget } from './server-widget'; // quebra

// ✅ CORRETO: padrão de slots
// app/page.tsx (Server Component)
import { ClientShell } from './client-shell';
import { ServerWidget } from './server-widget';

export default function Page() {
  return (
    <ClientShell>
      <ServerWidget /> {/* renderizado no servidor, passado como children */}
    </ClientShell>
  );
}
```

```tsx
// client-shell.tsx
'use client';
export function ClientShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div onClick={() => setOpen(!open)}>{children}</div>;
}
```

## Data fetching

- Busque dados diretamente no Server Component com `async/await` — não crie uma API route interna só para o próprio front consumir.
- Se o mesmo dado for necessário tanto em `generateMetadata` quanto na página, envolva a função de busca com `cache()` do React para evitar requisição duplicada (detalhes e exemplo em `seo-web-vitals`).
- Ao decidir entre Server Actions e API Routes para mutações, prefira Server Actions para formulários e mutações vindas diretamente da UI; use Route Handlers quando o consumidor for externo (webhooks, terceiros) — veja `stripe-integration` para o caso de webhook.

## RSC Payload — o que saber na prática

Você raramente precisa manipular o RSC Payload diretamente, mas entender o conceito evita bugs: em cada navegação, o servidor gera uma representação compacta da árvore renderizada (o "RSC Payload") contendo o HTML já resolvido dos Server Components, marcadores indicando onde cada Client Component entra (com referência ao seu arquivo JS) e as props serializadas passadas do servidor para o cliente. Isso implica uma regra prática: **props passadas de Server para Client Component precisam ser serializáveis** (sem funções, sem classes, sem `Date` bruto sem tratamento) — se precisar passar uma função, ela deve ser uma Server Action.

## Quando consultar a referência

Para exemplos mais completos de composição, providers globais e casos de borda de serialização de props, leia `reference/rsc-payload-e-composicao.md`.
