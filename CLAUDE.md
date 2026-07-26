# Contexto do projeto — imsure

## Sobre o projeto
Next.js (_App_ _Router_) baseado no tutorial oficial "Next.js Learn Dashboard", mas com uma feature própria sendo construída: uma tela de **contatos** (CRM-like), separada do fluxo de invoices/customers do tutorial original.

- Branch atual: `sandbox-dashboard` (já existe no GitHub, remote `origin` = https://github.com/Mitzvinicius/imsure)
- Gerenciador de pacotes: `npm` (tem `package-lock.json`)
- Existe também um projeto irmão do tutorial puro em `nextjs-dashboard` (outra pasta, no OneDrive), usado como referência de padrões (ex: `data.ts`, `definitions.ts`) mas não é o mesmo repositório.

## Estado atual da feature de contatos

### `app/lib/definitions.ts`
```ts
export type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  birth_date: string;
  gender: "masculino" | "feminino";
  situation: "cliente" | "lead" | "ex-cliente";
};
```
Sem `image_url` (removido de propósito).

### `app/lib/placeholder_data.ts`
Array mockado com 10 contatos (`export default contacts`), seguindo o `type Contact` acima. Serve para desenvolver a UI antes de existir banco de verdade.

### `app/ui/contacts/table.tsx`
Em progresso. Já importa `contacts` de `placeholder_data`, mas o corpo do componente é um rascunho colado de exemplo do **Material UI DataGrid** — ainda **não compila**: usa `Paper`, `DataGrid`, `rows`, `columns`, `paginationModel` sem importar nem definir nada disso.

Pendências conhecidas nesse arquivo:
- Instalar as libs: `npm install @mui/material @emotion/react @emotion/styled`
- Decidir Server vs Client Component: componentes do MUI usam CSS-in-JS/interatividade, então provavelmente precisam de `"use client"`. Hoje o componente é `async` (padrão de Server Component) mas não faz nenhum `await` de verdade ainda (dado é import estático) — vale reavaliar se o `async` ainda faz sentido nesse ponto.
- Mapear `rows`/`columns` do DataGrid a partir do array `contacts` (campos a exibir: nome, email, telefone, situation).

## Como o usuário gosta de trabalhar (importante)
O usuário (Mitz) está aprendendo a programar e prefere método socrático: **não quer código pronto entregue de primeira** para conceitos que ele está aprendendo — prefere pseudocódigo/Portugol, perguntas guiadas, e tentar escrever ele mesmo antes de eu revir. Dados mockados/boilerplate repetitivo (tipo os 10 contatos fakes) podem ser gerados diretamente, sem esse processo, quando ele pedir.

Perfil: forte em lógica de programação e modelagem de banco relacional (vem do Bubble), ainda desenvolvendo sintaxe de JS/TS/Python/React/Next.js e ferramentas (Docker, deploy).
