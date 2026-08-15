# Padrão manual: ThemeRegistry com cache do Emotion

Use apenas quando `@mui/material-nextjs` não atender (customização avançada do cache).

```tsx
// components/theme-registry.tsx
'use client';

import * as React from 'react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '@/shared/config/theme';

export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = React.useState(() => {
    const cache = createCache({ key: 'mui' });
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = '';
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </CacheProvider>
  );
}
```

```tsx
// app/layout.tsx
import { ThemeRegistry } from '@/components/theme-registry';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
```

## Por que isso funciona

`useServerInsertedHTML` injeta uma tag `<style>` no stream de HTML do servidor no momento exato em que o React está fazendo streaming daquele trecho da árvore — isso garante que os estilos gerados durante a renderização daquele Server Component cheguem ao navegador **antes** do conteúdo que eles estilizam, eliminando o flash sem estilo (FOUC) e evitando mismatch de hidratação entre servidor e cliente.
