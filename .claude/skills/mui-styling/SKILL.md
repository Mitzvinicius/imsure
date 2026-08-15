---
name: mui-styling
description: Integração do Material UI (MUI) com Next.js App Router — isolamento de ThemeProvider/CacheProvider em Client Component, configuração do cache do Emotion via useServerInsertedHTML, e uso opcional do Pigment CSS. Use SEMPRE que estiver configurando tema, adicionando MUI a um projeto Next.js, criando o layout raiz com estilização, ou se o usuário reportar "flash de estilo não aplicado" (FOUC) ou erros de hidratação relacionados a estilos.
---

# MUI + Next.js App Router

## Regra central

O `ThemeProvider` e o cache do Emotion (`@emotion/react`, `@emotion/cache`) **precisam estar isolados em um Client Component dedicado**, nunca soltos direto no `app/layout.tsx`. Isso é necessário porque o MUI/Emotion gera CSS-in-JS em tempo de execução, e sem o `useServerInsertedHTML` (de `next/navigation`) o CSS gerado no servidor não é injetado corretamente no HTML antes da hidratação, causando flash de conteúdo sem estilo.

## Caminho recomendado: `@mui/material-nextjs`

Prefira o pacote oficial de integração em vez de montar o cache manualmente — ele já encapsula o `useServerInsertedHTML` internamente e é mantido pelo próprio time do MUI:

```tsx
// app/layout.tsx
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '@/shared/config/theme';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppRouterCacheProvider options={{ key: 'mui' }}>
          <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
```

`AppRouterCacheProvider` já é um Client Component internamente — você não precisa (e não deve) marcar `app/layout.tsx` com `'use client'` por causa dele.

## Caminho manual (só se precisar de controle fino do cache)

Se precisar customizar o comportamento do cache do Emotion além do que a integração oficial permite, isole manualmente — veja `reference/theme-registry.md` para o padrão completo com `useServerInsertedHTML`.

## Pigment CSS — use com cautela

Pigment CSS é a proposta de extração de CSS zero-runtime do MUI (CSS extraído em build time em vez de gerado em runtime, compatível com Server Components). **Atenção:** o projeto está oficialmente em fase alpha e listado como "on hold" pelo próprio repositório do MUI. Não adote como base de produção sem avaliar esse status primeiro — para a maioria dos projetos novos, `@mui/material-nextjs` com Emotion em runtime é a escolha mais estável hoje.

## Erros comuns a evitar

- Marcar `app/layout.tsx` inteiro com `'use client'` "para resolver o erro do tema" — sintoma de que o isolamento não foi feito corretamente, não uma solução.
- Instanciar o `ThemeProvider` mais de uma vez em pontos diferentes da árvore sem necessidade — gera múltiplos caches de Emotion e comportamento inconsistente.
- Esquecer a `key` customizada no cache quando há mais de uma biblioteca CSS-in-JS no projeto (evita colisão de nomes de classe).
