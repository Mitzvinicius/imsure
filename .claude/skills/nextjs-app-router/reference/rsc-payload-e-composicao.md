# RSC Payload e padrões de composição — referência estendida

## O que é o RSC Payload, com mais detalhe

A documentação oficial do Next.js descreve o RSC Payload como uma representação compacta da árvore de React Server Components renderizada. Ele contém três coisas:

1. O resultado renderizado dos Server Components.
2. Placeholders indicando onde os Client Components devem ser injetados, junto com referências aos seus arquivos JavaScript.
3. Quaisquer props passadas de um Server Component para um Client Component.

No carregamento inicial, o servidor usa o RSC Payload junto com as instruções do cliente para gerar HTML no servidor (SSR), otimizando o First Contentful Paint. Em navegações subsequentes (via `<Link>` ou `router.push`), o RSC Payload é buscado novamente e usado para reconciliar a árvore no cliente sem recarregar a página inteira nem recalcular componentes que já são Client Components já montados.

**Nota terminológica:** você pode encontrar o RSC Payload descrito ora como "representação binária compacta", ora como um formato de texto "streamável" (o formato React Flight). Não é uma contradição grave — é uma diferença de nível de abstração entre a documentação de alto nível e a implementação interna. Para efeitos práticos de arquitetura, o que importa é o comportamento: HTML pré-computado do servidor + marcadores de hidratação + props serializadas.

## Exemplo completo: providers globais isolados corretamente

```tsx
// app/layout.tsx (Server Component — permanece Server Component)
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```tsx
// app/providers.tsx
'use client';
import { ThemeProvider } from '@/lib/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
```

Note que `app/layout.tsx` continua sendo Server Component — ele só importa `Providers`, que é a fronteira `'use client'`, e passa `children` (que pode incluir Server Components de páginas filhas) através dela.

## Casos de borda de serialização de props

Ao passar props de Server → Client, evite:

- **Funções não-Server-Action.** `onClick={fn}` só funciona se `fn` vier de dentro do próprio Client Component ou for uma Server Action (`'use server'`).
- **Classes e instâncias complexas** (ex.: instância de ORM, `Map`, `Set` sem tratamento) — serialize para objeto/array simples antes de passar.
- **`Date` bruto** — pode causar hidratação inconsistente entre servidor e cliente por fuso horário; formate no servidor e passe string, ou trate explicitamente no cliente.
- **Objetos circulares** — nunca serializam.

## Padrão: múltiplos slots nomeados

Quando um Client Component precisa de mais de uma "área" de Server Component (não apenas `children`), use props nomeadas:

```tsx
// server: app/dashboard/page.tsx
<Tabs
  overviewSlot={<OverviewServerWidget />}
  reportsSlot={<ReportsServerWidget />}
/>
```

```tsx
// client: components/tabs.tsx
'use client';
export function Tabs({ overviewSlot, reportsSlot }: { overviewSlot: React.ReactNode; reportsSlot: React.ReactNode }) {
  const [tab, setTab] = useState<'overview' | 'reports'>('overview');
  return (
    <div>
      <button onClick={() => setTab('overview')}>Visão geral</button>
      <button onClick={() => setTab('reports')}>Relatórios</button>
      {tab === 'overview' ? overviewSlot : reportsSlot}
    </div>
  );
}
```

Ambos os slots são renderizados no servidor de antemão — a troca de aba no cliente apenas alterna qual `ReactNode` já resolvido é exibido, sem nova requisição.
