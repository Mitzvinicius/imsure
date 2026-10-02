# Base de seguros no CRM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corretora cadastra e acompanha sua carteira (apólices com bem segurado, coberturas, parcelas, endossos, anexos), registra sinistros com histórico, emite apólice a partir de negócio e recebe negócios de renovação automaticamente no funil.

**Architecture:** Schema novo no Supabase (migrações SQL versionadas em `supabase/migrations/` e aplicadas pela ferramenta `apply_migration` do MCP do Supabase), RLS via duas funções helper `security definer`. Lógica pura (parcelas, status, validação, mapeamento de erros) em `app/lib/seguros/` coberta por Vitest. Server Actions em `app/lib/actions-seguros.ts` no padrão `{ error }`. Telas novas sob `app/corretoras/[corretoraId]/` no padrão `page.tsx` (server) + `NomeDaPagina.tsx` (client), MUI.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres 17, RLS, Storage, pg_cron), MUI 9 + `@mui/x-data-grid`, Vitest, pnpm (via `npx -y pnpm@10`).

**Spec:** `docs/superpowers/specs/2026-10-02-base-seguros-design.md`

## Global Constraints

- Toda Server Action retorna `{ error: string | null, ... }`; nunca lança exceção nem chama `redirect()` (navegação fica no cliente com `router.push`/`router.refresh`).
- Toda tabela nova tem RLS habilitado **e** policies na mesma migração; `auth.uid()` sempre como `(select auth.uid())`.
- Nomes de tabelas/colunas/mensagens em português; `id uuid default gen_random_uuid()`, `criado_em timestamptz not null default now()`.
- Cliente final **não** é contemplado nesta etapa (nenhuma policy para segurado).
- `pnpm` é o gerenciador; como não está instalado globalmente, todo comando é `npx -y pnpm@10 <comando>`.
- MUI em tudo; ícones de `@mui/icons-material`. MUI 9: usar `slotProps` (não `InputProps`/`InputLabelProps`).
- Datas de negócio como `date` (`YYYY-MM-DD`), "hoje" sempre no fuso `America/Sao_Paulo`.
- Valores monetários `numeric(12,2)` no banco; na UI, entrada com vírgula (`"1.234,56"`) convertida por `parseValorBR`.
- Nunca commitar `.env*`. Commits em Conventional Commits, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Verificação no navegador exige sessão logada no preview: o Mitz faz login uma vez no painel do navegador (Claude não digita senha nem cria conta no Supabase remoto).

## Review Focus

1. **Contato de outra corretora**: `criarApolice` recebendo `contatoId` que não pertence à `corretoraId` deve ser recusado com "Contato não encontrado nesta corretora" (FK não passa por RLS). → teste via validação na action (Task 7, passo de verificação SQL) e checagem explícita no código.
2. **Parcelas com mês curto**: 1º vencimento em 31/01 gerando 3 parcelas deve dar 31/01, 28 ou 29/02, 31/03 — nunca "pular" para março. → teste em Task 1.
3. **Centavos que não dividem**: prêmio 100,00 em 3 parcelas → 33,33 / 33,33 / 33,34, soma exata. → teste em Task 1.
4. **Renovação rodando duas vezes / apólice cancelada / sem fluxo**: não duplica, não cria para cancelada, não quebra se a corretora não tiver fluxo. → script `supabase/tests/renovacao.sql` em Task 5.
5. **Etapa de renovação renomeada ou inexistente**: onboarding com nomes sem "renova" não marca nada; configurações mostram aviso e a rotina cai na primeira etapa. → teste de `indiceEtapaRenovacao` em Task 2 e cenário no script de renovação (Task 5).

---

## File Structure

```
supabase/
  migrations/
    20261002120000_seguros_base.sql          # seguradoras, alterações, apólices, endossos, parcelas, coberturas, bens, RLS
    20261002120100_seguros_sinistros_anexos.sql  # sinistros, andamentos, anexos, bucket + storage policy
    20261002120200_seguros_renovacao.sql     # pg_cron + função criar_negocios_renovacao
  tests/
    rls_seguros.sql                           # prova isolamento entre duas contas
    renovacao.sql                             # prova idempotência e casos de borda
vitest.config.ts
app/lib/seguros/
  ramos.ts            (+ .test.ts)  # RAMOS_OPCOES, tipoBemDoRamo
  datas.ts            (+ .test.ts)  # hojeSaoPaulo, somarMeses, parseValorBR, formatData
  parcelas.ts         (+ .test.ts)  # gerarParcelas, diferencaCentavos
  status.ts           (+ .test.ts)  # calcularStatusApolice, LABEL_STATUS_APOLICE
  sinistros.ts        (+ .test.ts)  # status/tipos por ramo
  renovacao.ts        (+ .test.ts)  # indiceEtapaRenovacao
  validacao.ts        (+ .test.ts)  # validarPercentuaisBeneficiarios, validarApoliceForm
  erros.ts            (+ .test.ts)  # mensagemErroSeguros
  types.ts                          # tipos compartilhados das telas/actions
app/lib/actions-seguros.ts          # Server Actions de apólices, endossos, parcelas, anexos, sinistros, configurações
app/lib/actions.ts                  # modificado: salvarFluxoVendas marca etapa de renovação
app/onboarding/[corretoraId]/OnboardingWizard.tsx  # modificado: importa RAMOS_OPCOES
app/ui/design/Sidebar.tsx           # modificado: itens Apólices, Sinistros, Configurações
app/corretoras/[corretoraId]/
  apolices/
    page.tsx, ApolicesPage.tsx
    nova/page.tsx
    [apoliceId]/page.tsx, ApoliceDetail.tsx
    [apoliceId]/editar/page.tsx
    _components/
      ApoliceForm.tsx, ContatoPicker.tsx, BemSeguradoFields.tsx, VidasFields.tsx,
      CoberturasFields.tsx, ParcelasFields.tsx, ParcelasTab.tsx, EndossosTab.tsx,
      AnexosApoliceTab.tsx, carregarApolice.ts
  sinistros/
    page.tsx, SinistrosPage.tsx
    novo/page.tsx, NovoSinistroForm.tsx
    [sinistroId]/page.tsx, SinistroDetail.tsx
  configuracoes/
    page.tsx, ConfiguracoesPage.tsx
  funis/types.ts, funis/page.tsx, funis/DealDetail.tsx   # modificados: Emitir/Ver apólice
CLAUDE.md, docs/decisoes.md                               # atualizados no fim
```

---

### Task 1: Vitest + datas + geração de parcelas

**Files:**
- Create: `vitest.config.ts`, `app/lib/seguros/datas.ts`, `app/lib/seguros/datas.test.ts`, `app/lib/seguros/parcelas.ts`, `app/lib/seguros/parcelas.test.ts`
- Modify: `package.json` (script `test`, devDependency `vitest`)

**Interfaces:**
- Produces:
  - `hojeSaoPaulo(agora?: Date): string` → `"YYYY-MM-DD"`
  - `somarMeses(dataIso: string, meses: number): string`
  - `parseValorBR(s: string): number | null`
  - `formatData(dataIso: string | null): string` → `"DD/MM/AAAA"` ou `"—"`
  - `type ParcelaGerada = { numero: number; vencimento: string; valor: number }`
  - `gerarParcelas(args: { total: number; quantidade: number; primeiroVencimento: string }): ParcelaGerada[]` (lança `RangeError` se `quantidade` não for inteiro 1..48 ou `total <= 0`)
  - `diferencaCentavos(premio: number | null, valores: number[]): number` (soma − prêmio, em centavos; 0 se prêmio nulo)

- [ ] **Step 1: Instalar Vitest e configurar**

Run: `npx -y pnpm@10 add -D vitest`

Adicionar em `package.json` → `"scripts"`: `"test": "vitest run"`.

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    test: {
        include: ["app/**/*.test.ts"],
        environment: "node",
    },
    resolve: {
        alias: { "@": path.resolve(__dirname, ".") },
    },
});
```

- [ ] **Step 2: Escrever testes que falham**

Create `app/lib/seguros/datas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatData, hojeSaoPaulo, parseValorBR, somarMeses } from "./datas";

describe("somarMeses", () => {
    it("soma meses mantendo o dia", () => {
        expect(somarMeses("2026-01-15", 1)).toBe("2026-02-15");
        expect(somarMeses("2026-11-10", 3)).toBe("2027-02-10");
    });
    it("ajusta para o último dia em meses curtos", () => {
        expect(somarMeses("2026-01-31", 1)).toBe("2026-02-28");
        expect(somarMeses("2028-01-31", 1)).toBe("2028-02-29");
        expect(somarMeses("2026-01-31", 2)).toBe("2026-03-31");
    });
    it("zero meses devolve a mesma data", () => {
        expect(somarMeses("2026-05-20", 0)).toBe("2026-05-20");
    });
});

describe("hojeSaoPaulo", () => {
    it("usa o fuso de São Paulo", () => {
        // 02:00 UTC de 03/10 ainda é 23:00 de 02/10 em São Paulo
        expect(hojeSaoPaulo(new Date("2026-10-03T02:00:00Z"))).toBe("2026-10-02");
    });
});

describe("parseValorBR", () => {
    it("converte formato brasileiro", () => {
        expect(parseValorBR("1.234,56")).toBe(1234.56);
        expect(parseValorBR("R$ 99,9")).toBe(99.9);
        expect(parseValorBR("100")).toBe(100);
    });
    it("devolve null para vazio ou inválido", () => {
        expect(parseValorBR("")).toBeNull();
        expect(parseValorBR("   ")).toBeNull();
        expect(parseValorBR("abc")).toBeNull();
    });
});

describe("formatData", () => {
    it("formata ISO em DD/MM/AAAA", () => {
        expect(formatData("2026-10-02")).toBe("02/10/2026");
        expect(formatData("2026-10-02T15:00:00Z")).toBe("02/10/2026");
        expect(formatData(null)).toBe("—");
    });
});
```

Create `app/lib/seguros/parcelas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { diferencaCentavos, gerarParcelas } from "./parcelas";

describe("gerarParcelas", () => {
    it("divide valores iguais e o último absorve os centavos", () => {
        const p = gerarParcelas({ total: 100, quantidade: 3, primeiroVencimento: "2026-01-10" });
        expect(p.map((x) => x.valor)).toEqual([33.33, 33.33, 33.34]);
        expect(p.map((x) => x.numero)).toEqual([1, 2, 3]);
        expect(p.map((x) => x.vencimento)).toEqual(["2026-01-10", "2026-02-10", "2026-03-10"]);
    });
    it("respeita fim de mês curto", () => {
        const p = gerarParcelas({ total: 300, quantidade: 3, primeiroVencimento: "2026-01-31" });
        expect(p.map((x) => x.vencimento)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    });
    it("parcela única", () => {
        expect(gerarParcelas({ total: 1500.5, quantidade: 1, primeiroVencimento: "2026-06-01" }))
            .toEqual([{ numero: 1, vencimento: "2026-06-01", valor: 1500.5 }]);
    });
    it("rejeita quantidade ou total inválidos", () => {
        expect(() => gerarParcelas({ total: 100, quantidade: 0, primeiroVencimento: "2026-01-01" })).toThrow(RangeError);
        expect(() => gerarParcelas({ total: 100, quantidade: 49, primeiroVencimento: "2026-01-01" })).toThrow(RangeError);
        expect(() => gerarParcelas({ total: 100, quantidade: 2.5, primeiroVencimento: "2026-01-01" })).toThrow(RangeError);
        expect(() => gerarParcelas({ total: 0, quantidade: 2, primeiroVencimento: "2026-01-01" })).toThrow(RangeError);
    });
});

describe("diferencaCentavos", () => {
    it("calcula soma − prêmio em centavos", () => {
        expect(diferencaCentavos(100, [33.33, 33.33, 33.34])).toBe(0);
        expect(diferencaCentavos(100, [50, 55.1])).toBe(510);
        expect(diferencaCentavos(100, [40])).toBe(-6000);
    });
    it("prêmio nulo não gera diferença", () => {
        expect(diferencaCentavos(null, [10])).toBe(0);
    });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx -y pnpm@10 test`
Expected: FAIL — `Failed to resolve import "./datas"` / `"./parcelas"`.

- [ ] **Step 4: Implementar**

Create `app/lib/seguros/datas.ts`:

```ts
export function hojeSaoPaulo(agora: Date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(agora);
}

export function somarMeses(dataIso: string, meses: number): string {
    const [ano, mes, dia] = dataIso.slice(0, 10).split("-").map(Number);
    const alvo = new Date(Date.UTC(ano, mes - 1 + meses, 1));
    const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
    alvo.setUTCDate(Math.min(dia, ultimoDia));
    return alvo.toISOString().slice(0, 10);
}

export function parseValorBR(s: string): number | null {
    const limpo = s.replace(/[^\d,]/g, "").replace(",", ".");
    if (!limpo) return null;
    const n = parseFloat(limpo);
    return Number.isNaN(n) ? null : n;
}

export function formatData(dataIso: string | null): string {
    if (!dataIso) return "—";
    const [ano, mes, dia] = dataIso.slice(0, 10).split("-");
    return `${dia}/${mes}/${ano}`;
}
```

Create `app/lib/seguros/parcelas.ts`:

```ts
import { somarMeses } from "./datas";

export type ParcelaGerada = { numero: number; vencimento: string; valor: number };

export function gerarParcelas({
    total,
    quantidade,
    primeiroVencimento,
}: {
    total: number;
    quantidade: number;
    primeiroVencimento: string;
}): ParcelaGerada[] {
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 48) {
        throw new RangeError("Quantidade de parcelas deve ser entre 1 e 48");
    }
    if (!(total > 0)) {
        throw new RangeError("Valor total deve ser maior que zero");
    }
    const totalCentavos = Math.round(total * 100);
    const base = Math.floor(totalCentavos / quantidade);
    const ultima = totalCentavos - base * (quantidade - 1);

    return Array.from({ length: quantidade }, (_, i) => ({
        numero: i + 1,
        vencimento: somarMeses(primeiroVencimento, i),
        valor: (i === quantidade - 1 ? ultima : base) / 100,
    }));
}

export function diferencaCentavos(premio: number | null, valores: number[]): number {
    if (premio == null) return 0;
    const soma = valores.reduce((acc, v) => acc + Math.round(v * 100), 0);
    return soma - Math.round(premio * 100);
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx -y pnpm@10 test`
Expected: PASS (todos os testes de `datas` e `parcelas`).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts app/lib/seguros/datas.ts app/lib/seguros/datas.test.ts app/lib/seguros/parcelas.ts app/lib/seguros/parcelas.test.ts
git commit -m "feat(seguros): configura vitest e adiciona geração de parcelas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Regras de domínio puras (ramos, status, sinistros, renovação, validação, erros) + tipos

**Files:**
- Create: `app/lib/seguros/ramos.ts`, `status.ts`, `sinistros.ts`, `renovacao.ts`, `validacao.ts`, `erros.ts`, `types.ts` e os respectivos `.test.ts` (exceto `types.ts`)
- Modify: `app/onboarding/[corretoraId]/OnboardingWizard.tsx:31-34` (usar `RAMOS_OPCOES` importado)

**Interfaces:**
- Consumes: nada de tasks anteriores além de `datas.ts` (não usado aqui).
- Produces:
  - `RAMOS_OPCOES: readonly string[]`, `type TipoBem = "auto" | "residencial" | "vida" | "rc" | "livre"`, `tipoBemDoRamo(ramo: string): TipoBem`
  - `type StatusApolice = "vigente" | "vencida" | "renovada" | "cancelada"`, `calcularStatusApolice(a: { canceladaEm: string | null; fimVigencia: string; foiRenovada: boolean; hoje: string }): StatusApolice`, `LABEL_STATUS_APOLICE: Record<StatusApolice, string>`
  - `type StatusSinistro`, `statusDoRamo(ramo: string): StatusSinistro[]`, `statusValidoParaRamo(status: string, ramo: string): boolean`, `LABEL_STATUS_SINISTRO`, `tiposSinistroDoRamo(ramo: string): string[]`
  - `indiceEtapaRenovacao(nomes: string[]): number`
  - `validarPercentuaisBeneficiarios(percentuais: number[]): string | null`, `validarApoliceForm(f: ApoliceForm): string | null`
  - `mensagemErroSeguros(error: { code?: string; message: string }): string`
  - Tipos em `types.ts` (ver Step 4) — usados por todas as tasks de UI/actions.

- [ ] **Step 1: Escrever testes que falham**

Create `app/lib/seguros/ramos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { RAMOS_OPCOES, tipoBemDoRamo } from "./ramos";

describe("tipoBemDoRamo", () => {
    it("mapeia os quatro ramos estruturados", () => {
        expect(tipoBemDoRamo("Automóvel")).toBe("auto");
        expect(tipoBemDoRamo("Residencial")).toBe("residencial");
        expect(tipoBemDoRamo("Vida Individual")).toBe("vida");
        expect(tipoBemDoRamo("Resp. Civil Profissional")).toBe("rc");
    });
    it("demais ramos usam descrição livre", () => {
        expect(tipoBemDoRamo("Empresarial")).toBe("livre");
        expect(tipoBemDoRamo("Ramo inventado")).toBe("livre");
    });
    it("mantém a lista do onboarding", () => {
        expect(RAMOS_OPCOES).toEqual([
            "Automóvel", "Vida Individual", "Residencial",
            "Resp. Civil Profissional", "Empresarial", "Saúde",
        ]);
    });
});
```

Create `app/lib/seguros/status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calcularStatusApolice } from "./status";

const base = { canceladaEm: null, fimVigencia: "2026-12-31", foiRenovada: false, hoje: "2026-10-02" };

describe("calcularStatusApolice", () => {
    it("vigente antes do fim", () => {
        expect(calcularStatusApolice(base)).toBe("vigente");
    });
    it("o último dia ainda é vigente", () => {
        expect(calcularStatusApolice({ ...base, hoje: "2026-12-31" })).toBe("vigente");
    });
    it("vencida depois do fim", () => {
        expect(calcularStatusApolice({ ...base, hoje: "2027-01-01" })).toBe("vencida");
    });
    it("renovada tem prioridade sobre vencida", () => {
        expect(calcularStatusApolice({ ...base, hoje: "2027-01-01", foiRenovada: true })).toBe("renovada");
    });
    it("cancelada tem prioridade sobre tudo", () => {
        expect(calcularStatusApolice({ ...base, foiRenovada: true, canceladaEm: "2026-05-01" })).toBe("cancelada");
    });
});
```

Create `app/lib/seguros/sinistros.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { statusDoRamo, statusValidoParaRamo, tiposSinistroDoRamo } from "./sinistros";

describe("statusDoRamo", () => {
    it("auto inclui vistoria e oficina entre análise e aprovado", () => {
        expect(statusDoRamo("Automóvel")).toEqual([
            "aberto", "em_analise", "vistoria", "em_oficina", "documentacao_pendente",
            "aprovado", "negado", "indenizado", "encerrado",
        ]);
    });
    it("demais ramos usam a lista base", () => {
        expect(statusDoRamo("Residencial")).toEqual([
            "aberto", "em_analise", "documentacao_pendente", "aprovado", "negado", "indenizado", "encerrado",
        ]);
    });
});

describe("statusValidoParaRamo", () => {
    it("vistoria só vale para auto", () => {
        expect(statusValidoParaRamo("vistoria", "Automóvel")).toBe(true);
        expect(statusValidoParaRamo("vistoria", "Residencial")).toBe(false);
        expect(statusValidoParaRamo("inexistente", "Automóvel")).toBe(false);
    });
});

describe("tiposSinistroDoRamo", () => {
    it("auto tem colisão e roubo; livre tem 'Outro'", () => {
        expect(tiposSinistroDoRamo("Automóvel")).toContain("Colisão");
        expect(tiposSinistroDoRamo("Automóvel")).toContain("Roubo/Furto");
        expect(tiposSinistroDoRamo("Saúde")).toEqual(["Outro"]);
    });
});
```

Create `app/lib/seguros/renovacao.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { indiceEtapaRenovacao } from "./renovacao";

describe("indiceEtapaRenovacao", () => {
    it("acha a etapa padrão do onboarding", () => {
        expect(indiceEtapaRenovacao(["Prospecção / Renovações", "Contato feito", "Em negociação", "Arquivado"])).toBe(0);
    });
    it("ignora maiúsculas e acentos e pega a primeira", () => {
        expect(indiceEtapaRenovacao(["Novo", "RENOVACAO", "Renovações 2"])).toBe(1);
    });
    it("devolve -1 se nenhuma etapa fala de renovação", () => {
        expect(indiceEtapaRenovacao(["Novo", "Ganho", "Perdido"])).toBe(-1);
    });
});
```

Create `app/lib/seguros/validacao.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validarApoliceForm, validarPercentuaisBeneficiarios } from "./validacao";
import type { ApoliceForm } from "./types";

const formOk: ApoliceForm = {
    contatoId: "c1",
    novoContato: null,
    seguradoraId: "s1",
    ramo: "Automóvel",
    numero: "123",
    inicioVigencia: "2026-01-01",
    fimVigencia: "2027-01-01",
    premio: 1200,
    percentualComissao: 15,
    formaPagamento: "boleto",
    negocioOrigemId: null,
    apoliceAnteriorId: null,
    bem: { tipo: "auto", itens: [{ placa: "ABC1D23", chassi: "", marca: "Honda", modelo: "Civic", ano_fabricacao: 2022, ano_modelo: 2022, cep_pernoite: "" }] },
    coberturas: [{ nome: "Casco", importancia_segurada: 100000, franquia: 3500 }],
    parcelas: [{ numero: 1, vencimento: "2026-01-10", valor: 1200, comissao_esperada: 180, linha_digitavel: null, pix_copia_cola: null }],
};

describe("validarPercentuaisBeneficiarios", () => {
    it("aceita lista vazia e soma 100", () => {
        expect(validarPercentuaisBeneficiarios([])).toBeNull();
        expect(validarPercentuaisBeneficiarios([50, 50])).toBeNull();
        expect(validarPercentuaisBeneficiarios([33.33, 33.33, 33.34])).toBeNull();
    });
    it("rejeita soma diferente de 100 ou percentual não positivo", () => {
        expect(validarPercentuaisBeneficiarios([50, 40])).toMatch(/100%/);
        expect(validarPercentuaisBeneficiarios([100, 0])).toMatch(/maior que zero/);
    });
});

describe("validarApoliceForm", () => {
    it("aceita formulário completo", () => {
        expect(validarApoliceForm(formOk)).toBeNull();
    });
    it("exige cliente", () => {
        expect(validarApoliceForm({ ...formOk, contatoId: null })).toMatch(/cliente/i);
    });
    it("exige número, seguradora e ramo", () => {
        expect(validarApoliceForm({ ...formOk, numero: "  " })).toMatch(/número/i);
        expect(validarApoliceForm({ ...formOk, seguradoraId: "" })).toMatch(/seguradora/i);
        expect(validarApoliceForm({ ...formOk, ramo: "" })).toMatch(/ramo/i);
    });
    it("fim da vigência depois do início", () => {
        expect(validarApoliceForm({ ...formOk, fimVigencia: "2026-01-01" })).toMatch(/vigência/i);
    });
    it("parcelas com número repetido ou valor zero", () => {
        const p = formOk.parcelas[0];
        expect(validarApoliceForm({ ...formOk, parcelas: [p, { ...p }] })).toMatch(/repetid/i);
        expect(validarApoliceForm({ ...formOk, parcelas: [{ ...p, valor: 0 }] })).toMatch(/valor/i);
    });
    it("beneficiários de cada vida somam 100%", () => {
        const vida = { nome: "Ana", cpf: "", data_nascimento: null, beneficiarios: [{ nome: "Bia", parentesco: "Filha", percentual: 60 }] };
        expect(validarApoliceForm({ ...formOk, ramo: "Vida Individual", bem: { tipo: "vida", itens: [vida] } })).toMatch(/100%/);
    });
    it("cobertura sem nome", () => {
        expect(validarApoliceForm({ ...formOk, coberturas: [{ nome: " ", importancia_segurada: null, franquia: null }] })).toMatch(/cobertura/i);
    });
});
```

Create `app/lib/seguros/erros.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mensagemErroSeguros } from "./erros";

describe("mensagemErroSeguros", () => {
    it("número de apólice repetido na seguradora", () => {
        expect(mensagemErroSeguros({ code: "23505", message: 'duplicate key value violates unique constraint "apolices_seguradora_numero_key"' }))
            .toBe("Já existe uma apólice com esse número nessa seguradora.");
    });
    it("parcela e endosso repetidos", () => {
        expect(mensagemErroSeguros({ code: "23505", message: 'violates unique constraint "parcelas_apolice_numero_key"' }))
            .toBe("Já existe uma parcela com esse número.");
        expect(mensagemErroSeguros({ code: "23505", message: 'violates unique constraint "endossos_apolice_numero_key"' }))
            .toBe("Já existe um endosso com esse número nessa apólice.");
    });
    it("apólice já emitida para o negócio", () => {
        expect(mensagemErroSeguros({ code: "23505", message: 'violates unique constraint "apolices_negocio_origem_key"' }))
            .toBe("Esse negócio já tem uma apólice emitida.");
    });
    it("vigência inválida", () => {
        expect(mensagemErroSeguros({ code: "23514", message: 'violates check constraint "apolices_vigencia_check"' }))
            .toBe("O fim da vigência precisa ser depois do início.");
    });
    it("sem permissão", () => {
        expect(mensagemErroSeguros({ code: "42501", message: "new row violates row-level security policy" }))
            .toBe("Você não tem permissão para alterar esse registro.");
    });
    it("outros erros passam a mensagem original", () => {
        expect(mensagemErroSeguros({ message: "falhou" })).toBe("falhou");
    });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx -y pnpm@10 test`
Expected: FAIL — imports de `./ramos`, `./status`, `./sinistros`, `./renovacao`, `./validacao`, `./erros`, `./types` não resolvem.

- [ ] **Step 3: Implementar regras**

Create `app/lib/seguros/ramos.ts`:

```ts
export const RAMOS_OPCOES = [
    "Automóvel", "Vida Individual", "Residencial",
    "Resp. Civil Profissional", "Empresarial", "Saúde",
] as const;

export type TipoBem = "auto" | "residencial" | "vida" | "rc" | "livre";

const TIPO_POR_RAMO: Record<string, TipoBem> = {
    "Automóvel": "auto",
    "Residencial": "residencial",
    "Vida Individual": "vida",
    "Resp. Civil Profissional": "rc",
};

export function tipoBemDoRamo(ramo: string): TipoBem {
    return TIPO_POR_RAMO[ramo] ?? "livre";
}
```

Create `app/lib/seguros/status.ts`:

```ts
export type StatusApolice = "vigente" | "vencida" | "renovada" | "cancelada";

export const LABEL_STATUS_APOLICE: Record<StatusApolice, string> = {
    vigente: "Vigente",
    vencida: "Vencida",
    renovada: "Renovada",
    cancelada: "Cancelada",
};

export const COR_STATUS_APOLICE: Record<StatusApolice, "success" | "warning" | "info" | "default"> = {
    vigente: "success",
    vencida: "warning",
    renovada: "info",
    cancelada: "default",
};

export function calcularStatusApolice({
    canceladaEm,
    fimVigencia,
    foiRenovada,
    hoje,
}: {
    canceladaEm: string | null;
    fimVigencia: string;
    foiRenovada: boolean;
    hoje: string;
}): StatusApolice {
    if (canceladaEm) return "cancelada";
    if (foiRenovada) return "renovada";
    if (fimVigencia.slice(0, 10) < hoje) return "vencida";
    return "vigente";
}
```

Create `app/lib/seguros/sinistros.ts`:

```ts
import { tipoBemDoRamo, type TipoBem } from "./ramos";

export type StatusSinistro =
    | "aberto" | "em_analise" | "vistoria" | "em_oficina" | "documentacao_pendente"
    | "aprovado" | "negado" | "indenizado" | "encerrado";

export const LABEL_STATUS_SINISTRO: Record<StatusSinistro, string> = {
    aberto: "Aberto",
    em_analise: "Em análise",
    vistoria: "Vistoria",
    em_oficina: "Em oficina",
    documentacao_pendente: "Documentação pendente",
    aprovado: "Aprovado",
    negado: "Negado",
    indenizado: "Indenizado",
    encerrado: "Encerrado",
};

const BASE: StatusSinistro[] = ["aberto", "em_analise", "documentacao_pendente", "aprovado", "negado", "indenizado", "encerrado"];
const AUTO: StatusSinistro[] = ["aberto", "em_analise", "vistoria", "em_oficina", "documentacao_pendente", "aprovado", "negado", "indenizado", "encerrado"];

export function statusDoRamo(ramo: string): StatusSinistro[] {
    return tipoBemDoRamo(ramo) === "auto" ? AUTO : BASE;
}

export function statusValidoParaRamo(status: string, ramo: string): boolean {
    return (statusDoRamo(ramo) as string[]).includes(status);
}

const TIPOS: Record<TipoBem, string[]> = {
    auto: ["Colisão", "Roubo/Furto", "Incêndio", "Alagamento", "Vidros", "Terceiros", "Outro"],
    residencial: ["Incêndio", "Danos elétricos", "Roubo/Furto", "Vendaval", "Danos por água", "Outro"],
    vida: ["Morte", "Invalidez", "Doença grave", "Outro"],
    rc: ["Reclamação de terceiro", "Processo judicial", "Outro"],
    livre: ["Outro"],
};

export function tiposSinistroDoRamo(ramo: string): string[] {
    return TIPOS[tipoBemDoRamo(ramo)];
}
```

Create `app/lib/seguros/renovacao.ts`:

```ts
function normalizar(s: string) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function indiceEtapaRenovacao(nomes: string[]): number {
    return nomes.findIndex((n) => normalizar(n).includes("renova"));
}
```

Create `app/lib/seguros/erros.ts`:

```ts
const MENSAGENS_UNICIDADE: Record<string, string> = {
    apolices_seguradora_numero_key: "Já existe uma apólice com esse número nessa seguradora.",
    apolices_negocio_origem_key: "Esse negócio já tem uma apólice emitida.",
    apolices_apolice_anterior_key: "Essa apólice já foi renovada.",
    parcelas_apolice_numero_key: "Já existe uma parcela com esse número.",
    parcelas_endosso_numero_key: "Já existe uma parcela com esse número nesse endosso.",
    endossos_apolice_numero_key: "Já existe um endosso com esse número nessa apólice.",
};

export function mensagemErroSeguros(error: { code?: string; message: string }): string {
    if (error.code === "23505") {
        const chave = Object.keys(MENSAGENS_UNICIDADE).find((k) => error.message.includes(k));
        if (chave) return MENSAGENS_UNICIDADE[chave];
    }
    if (error.code === "23514" && error.message.includes("apolices_vigencia_check")) {
        return "O fim da vigência precisa ser depois do início.";
    }
    if (error.code === "42501") {
        return "Você não tem permissão para alterar esse registro.";
    }
    return error.message;
}
```

- [ ] **Step 4: Tipos compartilhados e validação**

Create `app/lib/seguros/types.ts`:

```ts
import type { StatusApolice } from "./status";
import type { StatusSinistro } from "./sinistros";

export type FormaPagamento = "boleto" | "cartao" | "debito";
export type StatusParcela = "aberta" | "paga" | "comissao_recebida";

export const LABEL_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
    boleto: "Boleto",
    cartao: "Cartão de crédito",
    debito: "Débito em conta",
};

export const LABEL_STATUS_PARCELA: Record<StatusParcela, string> = {
    aberta: "Em aberto",
    paga: "Paga",
    comissao_recebida: "Comissão recebida",
};

export type Seguradora = {
    id: string;
    nome: string;
    telefone_assistencia: string | null;
    telefone_sinistro: string | null;
};

export type NovoContato = {
    nome: string;
    email: string | null;
    telefone: string | null;
    cpfCnpj: string | null;
    tipoPessoa: "fisica" | "juridica";
};

export type ContatoResumo = { id: string; nome: string; cpf_cnpj: string | null };

export type BemAutoForm = {
    placa: string; chassi: string; marca: string; modelo: string;
    ano_fabricacao: number | null; ano_modelo: number | null; cep_pernoite: string;
};
export type BemResidencialForm = {
    cep: string; logradouro: string; numero: string; complemento: string;
    bairro: string; cidade: string; uf: string;
    tipo_imovel: "casa" | "apartamento" | "condominio" | "outro";
};
export type BemRcForm = { atividade: string; limite: number | null };
export type BeneficiarioForm = { nome: string; parentesco: string; percentual: number };
export type VidaSeguradaForm = { nome: string; cpf: string; data_nascimento: string | null; beneficiarios: BeneficiarioForm[] };

export type BemSeguradoForm =
    | { tipo: "auto"; itens: BemAutoForm[] }
    | { tipo: "residencial"; itens: BemResidencialForm[] }
    | { tipo: "rc"; itens: BemRcForm[] }
    | { tipo: "vida"; itens: VidaSeguradaForm[] }
    | { tipo: "livre"; descricao: string };

export type CoberturaForm = { nome: string; importancia_segurada: number | null; franquia: number | null };

export type ParcelaForm = {
    numero: number;
    vencimento: string;
    valor: number;
    comissao_esperada: number | null;
    linha_digitavel: string | null;
    pix_copia_cola: string | null;
};

export type ApoliceForm = {
    contatoId: string | null;
    novoContato: NovoContato | null;
    seguradoraId: string;
    ramo: string;
    numero: string;
    inicioVigencia: string;
    fimVigencia: string;
    premio: number | null;
    percentualComissao: number | null;
    formaPagamento: FormaPagamento;
    negocioOrigemId: string | null;
    apoliceAnteriorId: string | null;
    bem: BemSeguradoForm;
    coberturas: CoberturaForm[];
    parcelas: ParcelaForm[];
};

export type ApoliceLinha = {
    id: string;
    numero: string;
    ramo: string;
    inicio_vigencia: string;
    fim_vigencia: string;
    premio: number | null;
    status: StatusApolice;
    contato_nome: string;
    seguradora_nome: string;
    placas: string[];
    chassis: string[];
    proxima_parcela: string | null;
};

export type Parcela = {
    id: string;
    endosso_id: string | null;
    numero: number;
    vencimento: string;
    valor: number;
    comissao_esperada: number | null;
    status: StatusParcela;
    baixa_origem: "manual" | "extrato" | null;
    baixa_em: string | null;
    linha_digitavel: string | null;
    pix_copia_cola: string | null;
};

export type Endosso = {
    id: string;
    numero: string;
    tipo: TipoEndosso;
    data_emissao: string | null;
    descricao: string | null;
    valor: number | null;
};

export type TipoEndosso = "alteracao_bem" | "inclusao" | "exclusao" | "alteracao_cobertura" | "cancelamento" | "outro";

export const LABEL_TIPO_ENDOSSO: Record<TipoEndosso, string> = {
    alteracao_bem: "Alteração do bem",
    inclusao: "Inclusão",
    exclusao: "Exclusão",
    alteracao_cobertura: "Alteração de cobertura",
    cancelamento: "Cancelamento",
    outro: "Outro",
};

export type Cobertura = CoberturaForm & { id: string; endosso_id: string | null };

export type AnexoApolice = {
    id: string;
    nome_arquivo: string;
    tamanho_bytes: number | null;
    tipo_mime: string | null;
    usuario_nome: string;
    criado_em: string;
    url: string | null;
    endosso_id: string | null;
    parcela_id: string | null;
    sinistro_id: string | null;
    sinistro_andamento_id: string | null;
};

export type SinistroLinha = {
    id: string;
    apolice_id: string;
    apolice_numero: string;
    ramo: string;
    contato_nome: string;
    data_ocorrencia: string;
    tipo: string;
    status: StatusSinistro;
    numero_seguradora: string | null;
};

export type Andamento = {
    id: string;
    data: string;
    descricao: string;
    status_novo: StatusSinistro | null;
    numero_processo: string | null;
    usuario_nome: string;
};
```

Create `app/lib/seguros/validacao.ts`:

```ts
import type { ApoliceForm } from "./types";

export function validarPercentuaisBeneficiarios(percentuais: number[]): string | null {
    if (percentuais.length === 0) return null;
    if (percentuais.some((p) => !(p > 0))) return "Percentual de beneficiário deve ser maior que zero.";
    const somaCentesimos = percentuais.reduce((acc, p) => acc + Math.round(p * 100), 0);
    if (somaCentesimos !== 10000) return "Os percentuais dos beneficiários precisam somar 100%.";
    return null;
}

export function validarApoliceForm(f: ApoliceForm): string | null {
    if (!f.contatoId && !f.novoContato?.nome.trim()) return "Informe o cliente.";
    if (!f.seguradoraId) return "Informe a seguradora.";
    if (!f.ramo) return "Informe o ramo.";
    if (!f.numero.trim()) return "Informe o número da apólice.";
    if (!f.inicioVigencia || !f.fimVigencia) return "Informe o início e o fim da vigência.";
    if (f.fimVigencia <= f.inicioVigencia) return "O fim da vigência precisa ser depois do início.";

    if (f.coberturas.some((c) => !c.nome.trim())) return "Toda cobertura precisa de um nome.";

    const numeros = f.parcelas.map((p) => p.numero);
    if (new Set(numeros).size !== numeros.length) return "Há parcelas com número repetido.";
    if (f.parcelas.some((p) => !(p.valor > 0))) return "Toda parcela precisa ter valor maior que zero.";
    if (f.parcelas.some((p) => !p.vencimento)) return "Toda parcela precisa de vencimento.";

    if (f.bem.tipo === "vida") {
        for (const vida of f.bem.itens) {
            if (!vida.nome.trim()) return "Toda vida segurada precisa de um nome.";
            const erro = validarPercentuaisBeneficiarios(vida.beneficiarios.map((b) => b.percentual));
            if (erro) return `${vida.nome}: ${erro}`;
        }
    }
    if (f.bem.tipo === "rc" && f.bem.itens.some((i) => !i.atividade.trim())) return "Informe a atividade coberta.";
    return null;
}
```

- [ ] **Step 5: Onboarding usa a lista compartilhada**

Em `app/onboarding/[corretoraId]/OnboardingWizard.tsx`, remover o bloco local:

```ts
const RAMOS_OPCOES = [
    'Automóvel', 'Vida Individual', 'Residencial',
    'Resp. Civil Profissional', 'Empresarial', 'Saúde',
];
```

e adicionar junto aos imports:

```ts
import { RAMOS_OPCOES } from '@/app/lib/seguros/ramos';
```

- [ ] **Step 6: Rodar testes e lint**

Run: `npx -y pnpm@10 test && npx -y pnpm@10 lint`
Expected: todos os testes PASS; lint sem erros novos.

- [ ] **Step 7: Commit**

```bash
git add app/lib/seguros "app/onboarding/[corretoraId]/OnboardingWizard.tsx"
git commit -m "feat(seguros): regras de domínio puras e tipos compartilhados

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Migração — seguradoras, apólices, endossos, parcelas, coberturas, bens, RLS

**Files:**
- Create: `supabase/migrations/20261002120000_seguros_base.sql`, `supabase/tests/rls_seguros.sql`

**Interfaces:**
- Produces (banco): tabelas `seguradoras`, `apolices`, `endossos`, `parcelas`, `coberturas`, `bens_auto`, `bens_residencial`, `bens_rc`, `vidas_seguradas`, `beneficiarios`; colunas `corretoras.dias_antecedencia_renovacao`, `etapas.renovacao`, `negocios.apolice_renovada_id`; funções `public.usuario_possui_corretora(uuid)`, `public.usuario_possui_apolice(uuid)`. Nomes de constraints usados por `erros.ts`: `apolices_seguradora_numero_key`, `apolices_negocio_origem_key`, `apolices_apolice_anterior_key`, `apolices_vigencia_check`, `endossos_apolice_numero_key`, `parcelas_apolice_numero_key`, `parcelas_endosso_numero_key`. FK para embed: `apolices_negocio_origem_id_fkey`, `negocios_apolice_renovada_id_fkey`.

- [ ] **Step 1: Escrever o teste de RLS (vai falhar: tabelas não existem)**

Create `supabase/tests/rls_seguros.sql`:

```sql
-- Prova que a conta B não enxerga nem altera dados de seguros da conta A.
-- Roda dentro de uma transação e desfaz tudo no final.
begin;

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000aa', 'rls-a@teste.local', 'authenticated', 'authenticated', '{"nome":"Teste A"}'),
  ('00000000-0000-0000-0000-0000000000bb', 'rls-b@teste.local', 'authenticated', 'authenticated', '{"nome":"Teste B"}');

insert into public.contas (id, nome, plano_id, owner_usuario_id)
select '00000000-0000-0000-0000-00000000c0aa', 'Conta A', (select id from public.planos limit 1), '00000000-0000-0000-0000-0000000000aa';
insert into public.corretoras (id, conta_id, nome, onboarding_concluido)
values ('00000000-0000-0000-0000-00000000c1aa', '00000000-0000-0000-0000-00000000c0aa', 'Corretora A', true);
insert into public.contatos (id, corretora_id, nome, tipo_pessoa)
values ('00000000-0000-0000-0000-00000000c2aa', '00000000-0000-0000-0000-00000000c1aa', 'Cliente A', 'fisica');
insert into public.apolices (id, corretora_id, contato_id, seguradora_id, ramo, numero, inicio_vigencia, fim_vigencia, forma_pagamento)
values ('00000000-0000-0000-0000-00000000a0aa', '00000000-0000-0000-0000-00000000c1aa', '00000000-0000-0000-0000-00000000c2aa',
        (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'RLS-1', '2026-01-01', '2027-01-01', 'boleto');
insert into public.parcelas (apolice_id, numero, vencimento, valor) values ('00000000-0000-0000-0000-00000000a0aa', 1, '2026-02-01', 100);
insert into public.coberturas (apolice_id, nome) values ('00000000-0000-0000-0000-00000000a0aa', 'Casco');
insert into public.bens_auto (apolice_id, placa) values ('00000000-0000-0000-0000-00000000a0aa', 'RLS0A00');
insert into public.endossos (id, apolice_id, numero, tipo) values ('00000000-0000-0000-0000-00000000e0aa', '00000000-0000-0000-0000-00000000a0aa', '1', 'inclusao');
insert into public.vidas_seguradas (id, apolice_id, nome) values ('00000000-0000-0000-0000-00000000f0aa', '00000000-0000-0000-0000-00000000a0aa', 'Vida A');
insert into public.beneficiarios (vida_segurada_id, nome, percentual) values ('00000000-0000-0000-0000-00000000f0aa', 'Benef A', 100);

-- Como B
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.apolices) <> 0 then raise exception 'FALHA: B vê apólices de A'; end if;
  if (select count(*) from public.parcelas) <> 0 then raise exception 'FALHA: B vê parcelas de A'; end if;
  if (select count(*) from public.coberturas) <> 0 then raise exception 'FALHA: B vê coberturas de A'; end if;
  if (select count(*) from public.bens_auto) <> 0 then raise exception 'FALHA: B vê bens de A'; end if;
  if (select count(*) from public.endossos) <> 0 then raise exception 'FALHA: B vê endossos de A'; end if;
  if (select count(*) from public.vidas_seguradas) <> 0 then raise exception 'FALHA: B vê vidas de A'; end if;
  if (select count(*) from public.beneficiarios) <> 0 then raise exception 'FALHA: B vê beneficiários de A'; end if;
  if (select count(*) from public.seguradoras) = 0 then raise exception 'FALHA: B não vê a lista de seguradoras'; end if;

  begin
    insert into public.parcelas (apolice_id, numero, vencimento, valor) values ('00000000-0000-0000-0000-00000000a0aa', 99, '2026-03-01', 10);
    raise exception 'FALHA: B inseriu parcela na apólice de A';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.seguradoras (nome) values ('Seguradora pirata');
    raise exception 'FALHA: B inseriu seguradora';
  exception when insufficient_privilege then null;
  end;

  update public.apolices set numero = 'HACK' where id = '00000000-0000-0000-0000-00000000a0aa';
  if found then raise exception 'FALHA: B alterou apólice de A'; end if;
end $$;

-- Como A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.apolices) <> 1 then raise exception 'FALHA: A não vê a própria apólice'; end if;
  if (select count(*) from public.parcelas) <> 1 then raise exception 'FALHA: A não vê a própria parcela'; end if;
  if (select count(*) from public.beneficiarios) <> 1 then raise exception 'FALHA: A não vê o próprio beneficiário'; end if;
  insert into public.parcelas (apolice_id, endosso_id, numero, vencimento, valor)
    values ('00000000-0000-0000-0000-00000000a0aa', '00000000-0000-0000-0000-00000000e0aa', 1, '2026-04-01', 50);
end $$;

reset role;
select 'RLS OK' as resultado;
rollback;
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Executar o conteúdo de `supabase/tests/rls_seguros.sql` com a ferramenta `execute_sql` do Supabase (project_id `bmovnppkcvpjeieyugdz`).
Expected: erro `relation "public.apolices" does not exist`.

- [ ] **Step 3: Escrever a migração**

Create `supabase/migrations/20261002120000_seguros_base.sql`:

```sql
-- ===== Alterações em tabelas existentes =====
alter table public.corretoras
  add column dias_antecedencia_renovacao integer not null default 60
  constraint corretoras_dias_antecedencia_check check (dias_antecedencia_renovacao > 0 and dias_antecedencia_renovacao <= 365);

alter table public.etapas add column renovacao boolean not null default false;
create unique index etapas_uma_renovacao_por_fluxo on public.etapas (fluxo_id) where renovacao;

update public.etapas set renovacao = true
where id in (
  select distinct on (fluxo_id) id
  from public.etapas
  where translate(lower(nome), 'çãáàâéêíóôõú', 'caaaaeeiooou') like '%renova%'
  order by fluxo_id, ordem
);

-- ===== Helper de posse =====
create or replace function public.usuario_possui_corretora(p_corretora_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.corretoras c
    join public.contas ct on ct.id = c.conta_id
    where c.id = p_corretora_id and ct.owner_usuario_id = (select auth.uid())
  );
$$;

-- ===== Seguradoras (lista global) =====
create table public.seguradoras (
  id uuid primary key default gen_random_uuid(),
  nome text not null constraint seguradoras_nome_key unique,
  codigo_susep text constraint seguradoras_codigo_susep_key unique,
  telefone_assistencia text,
  telefone_sinistro text,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.seguradoras enable row level security;
create policy autenticado_pode_ler_seguradoras on public.seguradoras
  for select to authenticated using (true);

-- Telefones e códigos SUSEP ficam nulos até serem confirmados com fonte oficial.
insert into public.seguradoras (nome) values
  ('Allianz'), ('Azul Seguros'), ('Bradesco Seguros'), ('HDI Seguros'), ('Itaú Seguros'),
  ('Mapfre'), ('Mitsui Sumitomo'), ('Porto Seguro'), ('Sompo Seguros'), ('SulAmérica'),
  ('Suhai Seguradora'), ('Tokio Marine'), ('Yelum Seguros'), ('Zurich');

-- ===== Apólices =====
create table public.apolices (
  id uuid primary key default gen_random_uuid(),
  corretora_id uuid not null references public.corretoras(id) on delete cascade,
  contato_id uuid not null references public.contatos(id) on delete restrict,
  seguradora_id uuid not null references public.seguradoras(id),
  ramo text not null,
  numero text not null,
  inicio_vigencia date not null,
  fim_vigencia date not null,
  premio numeric(12,2),
  percentual_comissao numeric(5,2),
  forma_pagamento text not null constraint apolices_forma_pagamento_check check (forma_pagamento in ('boleto','cartao','debito')),
  cancelada_em date,
  descricao_bem text,
  negocio_origem_id uuid constraint apolices_negocio_origem_id_fkey references public.negocios(id) on delete set null,
  apolice_anterior_id uuid constraint apolices_apolice_anterior_id_fkey references public.apolices(id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint apolices_vigencia_check check (fim_vigencia > inicio_vigencia),
  constraint apolices_seguradora_numero_key unique (seguradora_id, numero),
  constraint apolices_negocio_origem_key unique (negocio_origem_id),
  constraint apolices_apolice_anterior_key unique (apolice_anterior_id)
);
create index apolices_corretora_id_idx on public.apolices (corretora_id);
create index apolices_contato_id_idx on public.apolices (contato_id);
create index apolices_fim_vigencia_idx on public.apolices (fim_vigencia);
alter table public.apolices enable row level security;
create policy owner_pode_gerenciar_apolices on public.apolices for all
  using (public.usuario_possui_corretora(corretora_id))
  with check (public.usuario_possui_corretora(corretora_id));

create or replace function public.usuario_possui_apolice(p_apolice_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.apolices a
    join public.corretoras c on c.id = a.corretora_id
    join public.contas ct on ct.id = c.conta_id
    where a.id = p_apolice_id and ct.owner_usuario_id = (select auth.uid())
  );
$$;

alter table public.negocios
  add column apolice_renovada_id uuid constraint negocios_apolice_renovada_id_fkey references public.apolices(id) on delete set null;
create unique index negocios_apolice_renovada_key on public.negocios (apolice_renovada_id) where apolice_renovada_id is not null;

-- ===== Endossos =====
create table public.endossos (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  numero text not null,
  tipo text not null constraint endossos_tipo_check check (tipo in ('alteracao_bem','inclusao','exclusao','alteracao_cobertura','cancelamento','outro')),
  data_emissao date,
  descricao text,
  valor numeric(12,2),
  criado_em timestamptz not null default now(),
  constraint endossos_apolice_numero_key unique (apolice_id, numero),
  constraint endossos_id_apolice_key unique (id, apolice_id)
);
alter table public.endossos enable row level security;
create policy owner_pode_gerenciar_endossos on public.endossos for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

-- ===== Parcelas =====
create table public.parcelas (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  endosso_id uuid,
  numero integer not null constraint parcelas_numero_check check (numero > 0),
  vencimento date not null,
  valor numeric(12,2) not null,
  comissao_esperada numeric(12,2),
  status text not null default 'aberta' constraint parcelas_status_check check (status in ('aberta','paga','comissao_recebida')),
  baixa_origem text constraint parcelas_baixa_origem_check check (baixa_origem in ('manual','extrato')),
  baixa_em timestamptz,
  baixa_referencia text,
  linha_digitavel text,
  pix_copia_cola text,
  criado_em timestamptz not null default now(),
  -- endosso precisa ser da mesma apólice
  constraint parcelas_endosso_fkey foreign key (endosso_id, apolice_id) references public.endossos(id, apolice_id) on delete cascade
);
create unique index parcelas_apolice_numero_key on public.parcelas (apolice_id, numero) where endosso_id is null;
create unique index parcelas_endosso_numero_key on public.parcelas (endosso_id, numero) where endosso_id is not null;
create index parcelas_vencimento_idx on public.parcelas (vencimento);
alter table public.parcelas enable row level security;
create policy owner_pode_gerenciar_parcelas on public.parcelas for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

-- ===== Coberturas =====
create table public.coberturas (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  endosso_id uuid,
  nome text not null,
  importancia_segurada numeric(14,2),
  franquia numeric(12,2),
  criado_em timestamptz not null default now(),
  constraint coberturas_endosso_fkey foreign key (endosso_id, apolice_id) references public.endossos(id, apolice_id) on delete cascade
);
create index coberturas_apolice_id_idx on public.coberturas (apolice_id);
alter table public.coberturas enable row level security;
create policy owner_pode_gerenciar_coberturas on public.coberturas for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

-- ===== Bens segurados =====
create table public.bens_auto (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  placa text, chassi text, marca text, modelo text,
  ano_fabricacao integer, ano_modelo integer, cep_pernoite text,
  criado_em timestamptz not null default now()
);
create index bens_auto_apolice_id_idx on public.bens_auto (apolice_id);
create index bens_auto_placa_idx on public.bens_auto (upper(placa));
create index bens_auto_chassi_idx on public.bens_auto (upper(chassi));
alter table public.bens_auto enable row level security;
create policy owner_pode_gerenciar_bens_auto on public.bens_auto for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

create table public.bens_residencial (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  cep text, logradouro text, numero text, complemento text, bairro text, cidade text, uf text,
  tipo_imovel text constraint bens_residencial_tipo_check check (tipo_imovel in ('casa','apartamento','condominio','outro')),
  criado_em timestamptz not null default now()
);
create index bens_residencial_apolice_id_idx on public.bens_residencial (apolice_id);
alter table public.bens_residencial enable row level security;
create policy owner_pode_gerenciar_bens_residencial on public.bens_residencial for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

create table public.bens_rc (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  atividade text not null,
  limite numeric(14,2),
  criado_em timestamptz not null default now()
);
create index bens_rc_apolice_id_idx on public.bens_rc (apolice_id);
alter table public.bens_rc enable row level security;
create policy owner_pode_gerenciar_bens_rc on public.bens_rc for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

create table public.vidas_seguradas (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  nome text not null,
  cpf text,
  data_nascimento date,
  criado_em timestamptz not null default now()
);
create index vidas_seguradas_apolice_id_idx on public.vidas_seguradas (apolice_id);
alter table public.vidas_seguradas enable row level security;
create policy owner_pode_gerenciar_vidas_seguradas on public.vidas_seguradas for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

create table public.beneficiarios (
  id uuid primary key default gen_random_uuid(),
  vida_segurada_id uuid not null references public.vidas_seguradas(id) on delete cascade,
  nome text not null,
  parentesco text,
  percentual numeric(5,2) not null constraint beneficiarios_percentual_check check (percentual > 0 and percentual <= 100),
  criado_em timestamptz not null default now()
);
create index beneficiarios_vida_segurada_id_idx on public.beneficiarios (vida_segurada_id);
alter table public.beneficiarios enable row level security;
create policy owner_pode_gerenciar_beneficiarios on public.beneficiarios for all
  using (exists (select 1 from public.vidas_seguradas v where v.id = vida_segurada_id and public.usuario_possui_apolice(v.apolice_id)))
  with check (exists (select 1 from public.vidas_seguradas v where v.id = vida_segurada_id and public.usuario_possui_apolice(v.apolice_id)));
```

- [ ] **Step 4: Aplicar a migração**

Ferramenta `apply_migration` do Supabase: `project_id = bmovnppkcvpjeieyugdz`, `name = seguros_base`, `query` = conteúdo do arquivo.
Expected: `{"success": true}`.

- [ ] **Step 5: Rodar o teste de RLS e ver passar**

Executar `supabase/tests/rls_seguros.sql` com `execute_sql`.
Expected: resultado `[{"resultado":"RLS OK"}]` (qualquer `FALHA: ...` = bug; corrigir policy e reaplicar com nova migração).

- [ ] **Step 6: Advisors de segurança**

Ferramenta `get_advisors` (`type: "security"`).
Expected: nenhum alerta novo de "RLS disabled" ou "policy missing" nas tabelas novas. Alertas de "security definer function exposed" para `usuario_possui_*` são aceitáveis (só respondem sobre o próprio usuário) — anotar no relatório final.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261002120000_seguros_base.sql supabase/tests/rls_seguros.sql
git commit -m "feat(db): tabelas de apólices, endossos, parcelas, coberturas e bens segurados com RLS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Migração — sinistros, andamentos, anexos e bucket

**Files:**
- Create: `supabase/migrations/20261002120100_seguros_sinistros_anexos.sql`
- Modify: `supabase/tests/rls_seguros.sql` (acrescentar sinistro/andamento/anexo)

**Interfaces:**
- Consumes: `public.usuario_possui_apolice(uuid)`, tabelas da Task 3.
- Produces: tabelas `sinistros`, `sinistro_andamentos`, `apolice_anexos`; bucket privado `apolice-anexos` com caminho `{apolice_id}/{timestamp}-{nome}`.

- [ ] **Step 1: Estender o teste de RLS (falha: tabelas não existem)**

Em `supabase/tests/rls_seguros.sql`, logo após o insert em `beneficiarios` (ainda como postgres), adicionar:

```sql
insert into public.sinistros (id, apolice_id, data_ocorrencia, tipo) values ('00000000-0000-0000-0000-00000000d0aa', '00000000-0000-0000-0000-00000000a0aa', '2026-05-01', 'Colisão');
insert into public.sinistro_andamentos (sinistro_id, descricao, status_novo, usuario_nome) values ('00000000-0000-0000-0000-00000000d0aa', 'Sinistro aberto', 'aberto', 'Teste A');
insert into public.apolice_anexos (apolice_id, sinistro_id, nome_arquivo, caminho_storage, usuario_nome)
  values ('00000000-0000-0000-0000-00000000a0aa', '00000000-0000-0000-0000-00000000d0aa', 'bo.pdf', '00000000-0000-0000-0000-00000000a0aa/1-bo.pdf', 'Teste A');
```

E dentro do primeiro bloco `do $$` (como B), antes do primeiro `begin` aninhado:

```sql
  if (select count(*) from public.sinistros) <> 0 then raise exception 'FALHA: B vê sinistros de A'; end if;
  if (select count(*) from public.sinistro_andamentos) <> 0 then raise exception 'FALHA: B vê andamentos de A'; end if;
  if (select count(*) from public.apolice_anexos) <> 0 then raise exception 'FALHA: B vê anexos de A'; end if;
```

E no bloco de A:

```sql
  if (select count(*) from public.sinistro_andamentos) <> 1 then raise exception 'FALHA: A não vê o próprio andamento'; end if;
```

Executar com `execute_sql`. Expected: `relation "public.sinistros" does not exist`.

- [ ] **Step 2: Escrever a migração**

Create `supabase/migrations/20261002120100_seguros_sinistros_anexos.sql`:

```sql
create table public.sinistros (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  bem_auto_id uuid references public.bens_auto(id) on delete set null,
  bem_residencial_id uuid references public.bens_residencial(id) on delete set null,
  data_ocorrencia date not null,
  tipo text not null,
  descricao text,
  numero_seguradora text,
  status text not null default 'aberto' constraint sinistros_status_check check (status in
    ('aberto','em_analise','vistoria','em_oficina','documentacao_pendente','aprovado','negado','indenizado','encerrado')),
  valor_indenizacao numeric(12,2),
  criado_em timestamptz not null default now()
);
create index sinistros_apolice_id_idx on public.sinistros (apolice_id);
alter table public.sinistros enable row level security;
create policy owner_pode_gerenciar_sinistros on public.sinistros for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

create table public.sinistro_andamentos (
  id uuid primary key default gen_random_uuid(),
  sinistro_id uuid not null references public.sinistros(id) on delete cascade,
  data timestamptz not null default now(),
  descricao text not null,
  status_novo text,
  numero_processo text,
  usuario_id uuid references auth.users(id),
  usuario_nome text not null,
  criado_em timestamptz not null default now()
);
create index sinistro_andamentos_sinistro_id_idx on public.sinistro_andamentos (sinistro_id);
alter table public.sinistro_andamentos enable row level security;
create policy owner_pode_gerenciar_sinistro_andamentos on public.sinistro_andamentos for all
  using (exists (select 1 from public.sinistros s where s.id = sinistro_id and public.usuario_possui_apolice(s.apolice_id)))
  with check (exists (select 1 from public.sinistros s where s.id = sinistro_id and public.usuario_possui_apolice(s.apolice_id)));

create table public.apolice_anexos (
  id uuid primary key default gen_random_uuid(),
  apolice_id uuid not null references public.apolices(id) on delete cascade,
  endosso_id uuid references public.endossos(id) on delete cascade,
  parcela_id uuid references public.parcelas(id) on delete cascade,
  sinistro_id uuid references public.sinistros(id) on delete cascade,
  sinistro_andamento_id uuid references public.sinistro_andamentos(id) on delete cascade,
  nome_arquivo text not null,
  caminho_storage text not null,
  tamanho_bytes bigint,
  tipo_mime text,
  usuario_id uuid references auth.users(id),
  usuario_nome text not null,
  criado_em timestamptz not null default now()
);
create index apolice_anexos_apolice_id_idx on public.apolice_anexos (apolice_id);
create index apolice_anexos_sinistro_id_idx on public.apolice_anexos (sinistro_id);
alter table public.apolice_anexos enable row level security;
create policy owner_pode_gerenciar_apolice_anexos on public.apolice_anexos for all
  using (public.usuario_possui_apolice(apolice_id))
  with check (public.usuario_possui_apolice(apolice_id));

insert into storage.buckets (id, name, public) values ('apolice-anexos', 'apolice-anexos', false)
on conflict (id) do nothing;

create policy owner_pode_gerenciar_storage_apolice_anexos on storage.objects for all
  using (
    bucket_id = 'apolice-anexos'
    and exists (select 1 from public.apolices a where a.id::text = (storage.foldername(name))[1] and public.usuario_possui_corretora(a.corretora_id))
  )
  with check (
    bucket_id = 'apolice-anexos'
    and exists (select 1 from public.apolices a where a.id::text = (storage.foldername(name))[1] and public.usuario_possui_corretora(a.corretora_id))
  );
```

- [ ] **Step 3: Aplicar**

`apply_migration` com `name = seguros_sinistros_anexos`. Expected: success.

- [ ] **Step 4: Rodar teste de RLS**

`execute_sql` com `supabase/tests/rls_seguros.sql`. Expected: `RLS OK`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261002120100_seguros_sinistros_anexos.sql supabase/tests/rls_seguros.sql
git commit -m "feat(db): sinistros, andamentos e anexos de apólice com RLS e bucket privado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Renovação automática (função + pg_cron) e onboarding marcando a etapa

**Files:**
- Create: `supabase/migrations/20261002120200_seguros_renovacao.sql`, `supabase/tests/renovacao.sql`
- Modify: `app/lib/actions.ts:98-145` (`salvarFluxoVendas`)

**Interfaces:**
- Consumes: `indiceEtapaRenovacao(nomes)` (Task 2); colunas `etapas.renovacao`, `corretoras.dias_antecedencia_renovacao`, `negocios.apolice_renovada_id` (Task 3).
- Produces: `public.criar_negocios_renovacao(p_hoje date default (now() at time zone 'America/Sao_Paulo')::date) returns integer` (nº de negócios criados); job `pg_cron` `criar-negocios-renovacao` diário 09:00 UTC. Negócio criado com `tipo = 'Renovação simples'`, `origem = 'Renovação'`.

- [ ] **Step 1: Escrever o teste da renovação (falha: função não existe)**

Create `supabase/tests/renovacao.sql`:

```sql
begin;

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000001aa', 'renov@teste.local', 'authenticated', 'authenticated', '{"nome":"Renov"}');
insert into public.contas (id, nome, plano_id, owner_usuario_id)
select '00000000-0000-0000-0000-0000000001c0', 'Conta R', (select id from public.planos limit 1), '00000000-0000-0000-0000-0000000001aa';
insert into public.corretoras (id, conta_id, nome, onboarding_concluido, dias_antecedencia_renovacao) values
  ('00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-0000000001c0', 'Corretora R', true, 60),
  ('00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-0000000001c0', 'Corretora sem fluxo', true, 60);
insert into public.fluxos (id, corretora_id, nome, ativo) values ('00000000-0000-0000-0000-0000000001f0', '00000000-0000-0000-0000-0000000001c1', 'Funil', true);
insert into public.etapas (id, fluxo_id, nome, ordem, renovacao) values
  ('00000000-0000-0000-0000-0000000001e0', '00000000-0000-0000-0000-0000000001f0', 'Novo', 0, false),
  ('00000000-0000-0000-0000-0000000001e1', '00000000-0000-0000-0000-0000000001f0', 'Renovações', 1, true);
insert into public.contatos (id, corretora_id, nome, tipo_pessoa) values
  ('00000000-0000-0000-0000-0000000001d0', '00000000-0000-0000-0000-0000000001c1', 'Cliente R', 'fisica'),
  ('00000000-0000-0000-0000-0000000002d0', '00000000-0000-0000-0000-0000000002c1', 'Cliente S', 'fisica');

-- hoje fixo = 2026-10-02 ; janela de 60 dias => fim_vigencia até 2026-12-01 entra
insert into public.apolices (id, corretora_id, contato_id, seguradora_id, ramo, numero, inicio_vigencia, fim_vigencia, forma_pagamento, premio, cancelada_em) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-0000000001d0', (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'R-DENTRO', '2025-11-15', '2026-11-15', 'boleto', 2000, null),
  ('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-0000000001d0', (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'R-FORA', '2026-03-01', '2027-03-01', 'boleto', 2000, null),
  ('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-0000000001d0', (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'R-CANCEL', '2025-11-15', '2026-11-15', 'boleto', 2000, '2026-06-01'),
  ('00000000-0000-0000-0000-0000000001a4', '00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-0000000001d0', (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'R-VENCIDA', '2025-01-01', '2026-01-01', 'boleto', 2000, null),
  ('00000000-0000-0000-0000-0000000002a1', '00000000-0000-0000-0000-0000000002c1', '00000000-0000-0000-0000-0000000002d0', (select id from public.seguradoras order by nome limit 1), 'Automóvel', 'S-SEMFLUXO', '2025-11-15', '2026-11-15', 'boleto', 2000, null);

do $$
declare n1 integer; n2 integer;
begin
  n1 := public.criar_negocios_renovacao('2026-10-02');
  n2 := public.criar_negocios_renovacao('2026-10-02');
  if n1 <> 1 then raise exception 'FALHA: esperava 1 negócio na 1ª execução, veio %', n1; end if;
  if n2 <> 0 then raise exception 'FALHA: 2ª execução duplicou (% negócios)', n2; end if;
  if (select count(*) from public.negocios where apolice_renovada_id = '00000000-0000-0000-0000-0000000001a1') <> 1 then
    raise exception 'FALHA: negócio de renovação não criado para R-DENTRO'; end if;
  if (select etapa_id from public.negocios where apolice_renovada_id = '00000000-0000-0000-0000-0000000001a1') <> '00000000-0000-0000-0000-0000000001e1' then
    raise exception 'FALHA: negócio não entrou na etapa de renovação'; end if;
  if (select vendedor_usuario_id from public.negocios where apolice_renovada_id = '00000000-0000-0000-0000-0000000001a1') <> '00000000-0000-0000-0000-0000000001aa' then
    raise exception 'FALHA: vendedor deveria cair no dono da conta'; end if;
  if exists (select 1 from public.negocios where apolice_renovada_id in ('00000000-0000-0000-0000-0000000001a2','00000000-0000-0000-0000-0000000001a3','00000000-0000-0000-0000-0000000001a4','00000000-0000-0000-0000-0000000002a1')) then
    raise exception 'FALHA: criou negócio para apólice fora da janela, cancelada, vencida ou sem fluxo'; end if;
end $$;

-- Sem etapa marcada: cai na primeira etapa por ordem
update public.etapas set renovacao = false where fluxo_id = '00000000-0000-0000-0000-0000000001f0';
delete from public.negocios where apolice_renovada_id = '00000000-0000-0000-0000-0000000001a1';
do $$
begin
  perform public.criar_negocios_renovacao('2026-10-02');
  if (select etapa_id from public.negocios where apolice_renovada_id = '00000000-0000-0000-0000-0000000001a1') <> '00000000-0000-0000-0000-0000000001e0' then
    raise exception 'FALHA: sem etapa marcada deveria cair na primeira etapa'; end if;
end $$;

select 'RENOVACAO OK' as resultado;
rollback;
```

Executar com `execute_sql`. Expected: `function public.criar_negocios_renovacao(unknown) does not exist`.

- [ ] **Step 2: Escrever a migração**

Create `supabase/migrations/20261002120200_seguros_renovacao.sql`:

```sql
create extension if not exists pg_cron;

create or replace function public.criar_negocios_renovacao(
  p_hoje date default (now() at time zone 'America/Sao_Paulo')::date
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_criados integer;
begin
  with candidatas as (
    select
      a.id as apolice_id,
      a.contato_id,
      a.ramo,
      a.premio,
      s.nome as seguradora_nome,
      coalesce(
        (select n.vendedor_usuario_id from public.negocios n where n.id = a.negocio_origem_id),
        ct.owner_usuario_id
      ) as vendedor_id,
      (
        select e.id
        from public.fluxos f
        join public.etapas e on e.fluxo_id = f.id
        where f.corretora_id = c.id
        order by f.ativo desc, f.criado_em asc, e.renovacao desc, e.ordem asc
        limit 1
      ) as etapa_id
    from public.apolices a
    join public.corretoras c on c.id = a.corretora_id
    join public.contas ct on ct.id = c.conta_id
    join public.seguradoras s on s.id = a.seguradora_id
    where a.cancelada_em is null
      and a.fim_vigencia >= p_hoje
      and a.fim_vigencia - c.dias_antecedencia_renovacao <= p_hoje
      and not exists (select 1 from public.apolices r where r.apolice_anterior_id = a.id)
  ),
  inseridos as (
    insert into public.negocios (etapa_id, contato_id, vendedor_usuario_id, tipo, ramo, seguradora, origem, valor, apolice_renovada_id)
    select etapa_id, contato_id, vendedor_id, 'Renovação simples', ramo, seguradora_nome, 'Renovação', premio, apolice_id
    from candidatas
    where etapa_id is not null
    on conflict (apolice_renovada_id) where apolice_renovada_id is not null do nothing
    returning 1
  )
  select count(*) into v_criados from inseridos;
  return v_criados;
end;
$$;

revoke execute on function public.criar_negocios_renovacao(date) from public, anon, authenticated;

select cron.schedule(
  'criar-negocios-renovacao',
  '0 9 * * *',
  $$select public.criar_negocios_renovacao()$$
);
```

- [ ] **Step 3: Aplicar e rodar o teste**

`apply_migration` com `name = seguros_renovacao`; depois `execute_sql` com `supabase/tests/renovacao.sql`.
Expected: `RENOVACAO OK`. Conferir job: `execute_sql` → `select jobname, schedule from cron.job;` mostra `criar-negocios-renovacao | 0 9 * * *`.

- [ ] **Step 4: Onboarding marca a etapa de renovação**

Em `app/lib/actions.ts`, adicionar import no topo:

```ts
import { indiceEtapaRenovacao } from "@/app/lib/seguros/renovacao";
```

e em `salvarFluxoVendas` trocar o insert de etapas:

```ts
    const { error: erroEtapas } = await supabase
        .from("etapas")
        .insert(etapas.map((nome, index) => ({ fluxo_id: fluxoId, nome, ordem: index })));
```

por:

```ts
    const indiceRenovacao = indiceEtapaRenovacao(etapas);
    const { error: erroEtapas } = await supabase
        .from("etapas")
        .insert(etapas.map((nome, index) => ({
            fluxo_id: fluxoId,
            nome,
            ordem: index,
            renovacao: index === indiceRenovacao,
        })));
```

Também remover a linha `import { cookies } from "next/headers";` de `app/lib/actions.ts` (import não usado, sobra do refactor do Carlos).

- [ ] **Step 5: Verificar build e testes**

Run: `npx -y pnpm@10 test && npx -y pnpm@10 build`
Expected: testes PASS, build sem erros.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261002120200_seguros_renovacao.sql supabase/tests/renovacao.sql app/lib/actions.ts
git commit -m "feat(seguros): renovação automática diária e marcação da etapa no onboarding

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Server Actions de apólices, endossos, parcelas e anexos

**Files:**
- Create: `app/lib/actions-seguros.ts`

**Interfaces:**
- Consumes: `validarApoliceForm`, `mensagemErroSeguros`, `tipoBemDoRamo`, `hojeSaoPaulo`, tipos de `types.ts` (Task 2); tabelas (Tasks 3–4).
- Produces (todas `async`, retorno com `error: string | null`):
  - `criarApolice({ corretoraId, dados }: { corretoraId: string; dados: ApoliceForm }): Promise<{ error: string | null; apoliceId: string | null }>`
  - `atualizarApolice({ apoliceId, dados }: { apoliceId: string; dados: ApoliceForm }): Promise<{ error: string | null }>` (atualiza dados gerais, substitui bem e coberturas da apólice; **não** mexe em parcelas)
  - `cancelarApolice({ apoliceId, data }: { apoliceId: string; data: string | null }): Promise<{ error: string | null }>` (`data = null` desfaz)
  - `adicionarParcelas({ apoliceId, endossoId, parcelas }: { apoliceId: string; endossoId: string | null; parcelas: ParcelaForm[] })`
  - `atualizarParcela({ parcelaId, dados }: { parcelaId: string; dados: Pick<ParcelaForm, "vencimento" | "valor" | "comissao_esperada" | "linha_digitavel" | "pix_copia_cola"> })`
  - `darBaixaManual({ parcelaId, desfazer }: { parcelaId: string; desfazer: boolean })`
  - `criarEndosso({ apoliceId, numero, tipo, dataEmissao, descricao, valor, coberturas, parcelas })`
  - `listarAnexosApolice({ apoliceId, sinistroId }: { apoliceId: string; sinistroId?: string | null }): Promise<{ error: string | null; anexos: AnexoApolice[] }>`
  - `uploadAnexoApolice(formData: FormData)` — campos `apoliceId`, `arquivo`, opcionais `endossoId`, `parcelaId`, `sinistroId`, `andamentoId`
  - `deletarAnexoApolice({ anexoId }: { anexoId: string })`

- [ ] **Step 1: Escrever o arquivo de actions**

Create `app/lib/actions-seguros.ts`:

```ts
'use server'

import { createClient } from "@/utils/supabase/server";
import { validarApoliceForm } from "@/app/lib/seguros/validacao";
import { mensagemErroSeguros } from "@/app/lib/seguros/erros";
import { hojeSaoPaulo } from "@/app/lib/seguros/datas";
import type { AnexoApolice, ApoliceForm, CoberturaForm, ParcelaForm, TipoEndosso } from "@/app/lib/seguros/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const BUCKET_ANEXOS_APOLICE = "apolice-anexos";
const TAMANHO_MAXIMO_ANEXO = 20 * 1024 * 1024;

function nomeUsuario(user: { email?: string; user_metadata?: Record<string, unknown> }) {
    return (user.user_metadata?.nome as string | undefined) ?? user.email ?? "Você";
}

function erroContato(error: { code?: string; message: string }) {
    if (error.code === "23505") return "Já existe um contato com esse CPF/CNPJ cadastrado nessa corretora.";
    return error.message;
}

async function resolverContato(supabase: Supabase, corretoraId: string, dados: ApoliceForm): Promise<{ error: string | null; contatoId: string | null }> {
    if (dados.contatoId) {
        const { data } = await supabase
            .from("contatos")
            .select("id")
            .eq("id", dados.contatoId)
            .eq("corretora_id", corretoraId)
            .maybeSingle();
        if (!data) return { error: "Contato não encontrado nesta corretora.", contatoId: null };
        return { error: null, contatoId: data.id as string };
    }
    if (!dados.novoContato) return { error: "Informe o cliente.", contatoId: null };
    const { data, error } = await supabase
        .from("contatos")
        .insert({
            corretora_id: corretoraId,
            nome: dados.novoContato.nome,
            email: dados.novoContato.email,
            telefone: dados.novoContato.telefone,
            cpf_cnpj: dados.novoContato.cpfCnpj,
            tipo_pessoa: dados.novoContato.tipoPessoa,
        })
        .select("id")
        .single();
    if (error || !data) return { error: error ? erroContato(error) : "Não foi possível criar o contato", contatoId: null };
    return { error: null, contatoId: data.id as string };
}

async function salvarBem(supabase: Supabase, apoliceId: string, dados: ApoliceForm): Promise<string | null> {
    for (const tabela of ["bens_auto", "bens_residencial", "bens_rc", "vidas_seguradas"]) {
        const { error } = await supabase.from(tabela).delete().eq("apolice_id", apoliceId);
        if (error) return mensagemErroSeguros(error);
    }
    const bem = dados.bem;
    if (bem.tipo === "livre") return null;
    if (bem.tipo === "vida") {
        for (const vida of bem.itens) {
            const { data: vidaCriada, error } = await supabase
                .from("vidas_seguradas")
                .insert({ apolice_id: apoliceId, nome: vida.nome, cpf: vida.cpf || null, data_nascimento: vida.data_nascimento })
                .select("id")
                .single();
            if (error || !vidaCriada) return error ? mensagemErroSeguros(error) : "Não foi possível salvar a vida segurada";
            if (vida.beneficiarios.length) {
                const { error: erroBenef } = await supabase.from("beneficiarios").insert(
                    vida.beneficiarios.map((b) => ({ vida_segurada_id: vidaCriada.id, nome: b.nome, parentesco: b.parentesco || null, percentual: b.percentual })),
                );
                if (erroBenef) return mensagemErroSeguros(erroBenef);
            }
        }
        return null;
    }
    const tabela = bem.tipo === "auto" ? "bens_auto" : bem.tipo === "residencial" ? "bens_residencial" : "bens_rc";
    if (!bem.itens.length) return null;
    const { error } = await supabase.from(tabela).insert(bem.itens.map((i) => ({ ...i, apolice_id: apoliceId })));
    return error ? mensagemErroSeguros(error) : null;
}

async function salvarCoberturasDaApolice(supabase: Supabase, apoliceId: string, coberturas: CoberturaForm[]): Promise<string | null> {
    const { error: erroDelete } = await supabase.from("coberturas").delete().eq("apolice_id", apoliceId).is("endosso_id", null);
    if (erroDelete) return mensagemErroSeguros(erroDelete);
    if (!coberturas.length) return null;
    const { error } = await supabase.from("coberturas").insert(coberturas.map((c) => ({ ...c, apolice_id: apoliceId })));
    return error ? mensagemErroSeguros(error) : null;
}

function linhaApolice(dados: ApoliceForm) {
    return {
        seguradora_id: dados.seguradoraId,
        ramo: dados.ramo,
        numero: dados.numero.trim(),
        inicio_vigencia: dados.inicioVigencia,
        fim_vigencia: dados.fimVigencia,
        premio: dados.premio,
        percentual_comissao: dados.percentualComissao,
        forma_pagamento: dados.formaPagamento,
        descricao_bem: dados.bem.tipo === "livre" ? dados.bem.descricao : null,
    };
}

function linhasParcelas(apoliceId: string, endossoId: string | null, parcelas: ParcelaForm[]) {
    return parcelas.map((p) => ({
        apolice_id: apoliceId,
        endosso_id: endossoId,
        numero: p.numero,
        vencimento: p.vencimento,
        valor: p.valor,
        comissao_esperada: p.comissao_esperada,
        linha_digitavel: p.linha_digitavel,
        pix_copia_cola: p.pix_copia_cola,
    }));
}

export async function criarApolice({ corretoraId, dados }: { corretoraId: string; dados: ApoliceForm }) {
    const erroValidacao = validarApoliceForm(dados);
    if (erroValidacao) return { error: erroValidacao, apoliceId: null };

    const supabase = await createClient();
    const contato = await resolverContato(supabase, corretoraId, dados);
    if (contato.error || !contato.contatoId) return { error: contato.error, apoliceId: null };

    const { data: apolice, error } = await supabase
        .from("apolices")
        .insert({
            ...linhaApolice(dados),
            corretora_id: corretoraId,
            contato_id: contato.contatoId,
            negocio_origem_id: dados.negocioOrigemId,
            apolice_anterior_id: dados.apoliceAnteriorId,
        })
        .select("id")
        .single();
    if (error || !apolice) return { error: error ? mensagemErroSeguros(error) : "Não foi possível criar a apólice", apoliceId: null };

    const apoliceId = apolice.id as string;
    const desfazer = async (mensagem: string) => {
        await supabase.from("apolices").delete().eq("id", apoliceId);
        return { error: mensagem, apoliceId: null };
    };

    const erroBem = await salvarBem(supabase, apoliceId, dados);
    if (erroBem) return desfazer(erroBem);
    const erroCob = await salvarCoberturasDaApolice(supabase, apoliceId, dados.coberturas);
    if (erroCob) return desfazer(erroCob);
    if (dados.parcelas.length) {
        const { error: erroParc } = await supabase.from("parcelas").insert(linhasParcelas(apoliceId, null, dados.parcelas));
        if (erroParc) return desfazer(mensagemErroSeguros(erroParc));
    }

    if (dados.negocioOrigemId) {
        await supabase.from("negocios").update({ fechado_em: hojeSaoPaulo() }).eq("id", dados.negocioOrigemId).is("fechado_em", null);
    }
    return { error: null, apoliceId };
}

export async function atualizarApolice({ apoliceId, dados }: { apoliceId: string; dados: ApoliceForm }) {
    const erroValidacao = validarApoliceForm({ ...dados, parcelas: [] });
    if (erroValidacao) return { error: erroValidacao };

    const supabase = await createClient();
    const { data: atual } = await supabase.from("apolices").select("corretora_id").eq("id", apoliceId).maybeSingle();
    if (!atual) return { error: "Apólice não encontrada" };

    const contato = await resolverContato(supabase, atual.corretora_id as string, dados);
    if (contato.error || !contato.contatoId) return { error: contato.error };

    const { error } = await supabase
        .from("apolices")
        .update({ ...linhaApolice(dados), contato_id: contato.contatoId })
        .eq("id", apoliceId);
    if (error) return { error: mensagemErroSeguros(error) };

    const erroBem = await salvarBem(supabase, apoliceId, dados);
    if (erroBem) return { error: erroBem };
    const erroCob = await salvarCoberturasDaApolice(supabase, apoliceId, dados.coberturas);
    if (erroCob) return { error: erroCob };
    return { error: null };
}

export async function cancelarApolice({ apoliceId, data }: { apoliceId: string; data: string | null }) {
    const supabase = await createClient();
    const { error } = await supabase.from("apolices").update({ cancelada_em: data }).eq("id", apoliceId);
    return { error: error ? mensagemErroSeguros(error) : null };
}

export async function adicionarParcelas({ apoliceId, endossoId, parcelas }: { apoliceId: string; endossoId: string | null; parcelas: ParcelaForm[] }) {
    if (!parcelas.length) return { error: "Nenhuma parcela informada" };
    if (parcelas.some((p) => !(p.valor > 0) || !p.vencimento)) return { error: "Toda parcela precisa de vencimento e valor maior que zero." };
    const supabase = await createClient();
    const { error } = await supabase.from("parcelas").insert(linhasParcelas(apoliceId, endossoId, parcelas));
    return { error: error ? mensagemErroSeguros(error) : null };
}

export async function atualizarParcela({
    parcelaId,
    dados,
}: {
    parcelaId: string;
    dados: Pick<ParcelaForm, "vencimento" | "valor" | "comissao_esperada" | "linha_digitavel" | "pix_copia_cola">;
}) {
    if (!(dados.valor > 0) || !dados.vencimento) return { error: "Informe vencimento e valor maior que zero." };
    const supabase = await createClient();
    const { error } = await supabase.from("parcelas").update(dados).eq("id", parcelaId);
    return { error: error ? mensagemErroSeguros(error) : null };
}

export async function darBaixaManual({ parcelaId, desfazer }: { parcelaId: string; desfazer: boolean }) {
    const supabase = await createClient();
    const { data: parcela } = await supabase.from("parcelas").select("status, baixa_origem").eq("id", parcelaId).maybeSingle();
    if (!parcela) return { error: "Parcela não encontrada" };
    if (parcela.baixa_origem === "extrato") return { error: "Essa baixa veio do extrato de comissão e não pode ser alterada manualmente." };

    const { error } = await supabase
        .from("parcelas")
        .update(desfazer
            ? { status: "aberta", baixa_origem: null, baixa_em: null }
            : { status: "paga", baixa_origem: "manual", baixa_em: new Date().toISOString() })
        .eq("id", parcelaId);
    return { error: error ? mensagemErroSeguros(error) : null };
}

export async function criarEndosso({
    apoliceId,
    numero,
    tipo,
    dataEmissao,
    descricao,
    valor,
    coberturas,
    parcelas,
}: {
    apoliceId: string;
    numero: string;
    tipo: TipoEndosso;
    dataEmissao: string | null;
    descricao: string | null;
    valor: number | null;
    coberturas: CoberturaForm[];
    parcelas: ParcelaForm[];
}) {
    if (!numero.trim()) return { error: "Informe o número do endosso" };
    if (coberturas.some((c) => !c.nome.trim())) return { error: "Toda cobertura precisa de um nome." };
    if (parcelas.some((p) => !(p.valor > 0) || !p.vencimento)) return { error: "Toda parcela precisa de vencimento e valor maior que zero." };

    const supabase = await createClient();
    const { data: endosso, error } = await supabase
        .from("endossos")
        .insert({ apolice_id: apoliceId, numero: numero.trim(), tipo, data_emissao: dataEmissao, descricao, valor })
        .select("id")
        .single();
    if (error || !endosso) return { error: error ? mensagemErroSeguros(error) : "Não foi possível criar o endosso" };

    const desfazer = async (mensagem: string) => {
        await supabase.from("endossos").delete().eq("id", endosso.id);
        return { error: mensagem };
    };
    if (coberturas.length) {
        const { error: e } = await supabase.from("coberturas").insert(coberturas.map((c) => ({ ...c, apolice_id: apoliceId, endosso_id: endosso.id })));
        if (e) return desfazer(mensagemErroSeguros(e));
    }
    if (parcelas.length) {
        const { error: e } = await supabase.from("parcelas").insert(linhasParcelas(apoliceId, endosso.id as string, parcelas));
        if (e) return desfazer(mensagemErroSeguros(e));
    }
    return { error: null };
}

export async function listarAnexosApolice({ apoliceId, sinistroId = null }: { apoliceId: string; sinistroId?: string | null }) {
    const supabase = await createClient();
    let query = supabase
        .from("apolice_anexos")
        .select("id, nome_arquivo, tamanho_bytes, tipo_mime, usuario_nome, criado_em, caminho_storage, endosso_id, parcela_id, sinistro_id, sinistro_andamento_id")
        .eq("apolice_id", apoliceId)
        .order("criado_em", { ascending: false });
    if (sinistroId) query = query.eq("sinistro_id", sinistroId);

    const { data, error } = await query;
    if (error) return { error: error.message, anexos: [] as AnexoApolice[] };

    const anexos = await Promise.all(
        (data ?? []).map(async ({ caminho_storage, ...anexo }) => {
            const { data: signed } = await supabase.storage.from(BUCKET_ANEXOS_APOLICE).createSignedUrl(caminho_storage as string, 300);
            return { ...anexo, url: signed?.signedUrl ?? null } as AnexoApolice;
        }),
    );
    return { error: null, anexos };
}

export async function uploadAnexoApolice(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Usuario não encontrado" };

    const apoliceId = formData.get("apoliceId");
    const arquivo = formData.get("arquivo");
    if (typeof apoliceId !== "string" || !(arquivo instanceof File)) return { error: "Arquivo inválido" };
    if (arquivo.size > TAMANHO_MAXIMO_ANEXO) return { error: "Arquivo maior que 20MB" };

    const opcional = (campo: string) => {
        const v = formData.get(campo);
        return typeof v === "string" && v ? v : null;
    };

    const caminho = `${apoliceId}/${Date.now()}-${arquivo.name}`;
    const { error: erroUpload } = await supabase.storage.from(BUCKET_ANEXOS_APOLICE).upload(caminho, arquivo);
    if (erroUpload) return { error: erroUpload.message };

    const { error: erroInsert } = await supabase.from("apolice_anexos").insert({
        apolice_id: apoliceId,
        endosso_id: opcional("endossoId"),
        parcela_id: opcional("parcelaId"),
        sinistro_id: opcional("sinistroId"),
        sinistro_andamento_id: opcional("andamentoId"),
        usuario_id: user.id,
        usuario_nome: nomeUsuario(user),
        nome_arquivo: arquivo.name,
        caminho_storage: caminho,
        tamanho_bytes: arquivo.size,
        tipo_mime: arquivo.type || null,
    });
    if (erroInsert) {
        await supabase.storage.from(BUCKET_ANEXOS_APOLICE).remove([caminho]);
        return { error: mensagemErroSeguros(erroInsert) };
    }
    return { error: null };
}

export async function deletarAnexoApolice({ anexoId }: { anexoId: string }) {
    const supabase = await createClient();
    const { data: anexo, error: erroBusca } = await supabase.from("apolice_anexos").select("caminho_storage").eq("id", anexoId).single();
    if (erroBusca || !anexo) return { error: erroBusca?.message ?? "Anexo não encontrado" };

    const { error: erroStorage } = await supabase.storage.from(BUCKET_ANEXOS_APOLICE).remove([anexo.caminho_storage as string]);
    if (erroStorage) return { error: erroStorage.message };

    const { error } = await supabase.from("apolice_anexos").delete().eq("id", anexoId);
    return { error: error ? mensagemErroSeguros(error) : null };
}
```

- [ ] **Step 2: Type-check e lint**

Run: `npx -y pnpm@10 build && npx -y pnpm@10 lint`
Expected: sem erros (o build roda o `tsc`).

- [ ] **Step 3: Verificar o caminho crítico no banco (como dono)**

Com `execute_sql`, simular o que `criarApolice` faz, garantindo que as constraints que a action depende funcionam (rodar e desfazer):

```sql
begin;
insert into auth.users (id, email, aud, role, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000003aa','act@teste.local','authenticated','authenticated','{"nome":"Act"}');
insert into public.contas (id, nome, plano_id, owner_usuario_id) select '00000000-0000-0000-0000-0000000003c0','C',(select id from public.planos limit 1),'00000000-0000-0000-0000-0000000003aa';
insert into public.corretoras (id, conta_id, nome) values ('00000000-0000-0000-0000-0000000003c1','00000000-0000-0000-0000-0000000003c0','C');
insert into public.contatos (id, corretora_id, nome, tipo_pessoa) values ('00000000-0000-0000-0000-0000000003d0','00000000-0000-0000-0000-0000000003c1','X','fisica');
insert into public.apolices (corretora_id, contato_id, seguradora_id, ramo, numero, inicio_vigencia, fim_vigencia, forma_pagamento)
values ('00000000-0000-0000-0000-0000000003c1','00000000-0000-0000-0000-0000000003d0',(select id from public.seguradoras order by nome limit 1),'Automóvel','DUP','2026-01-01','2027-01-01','boleto');
do $$ begin
  begin
    insert into public.apolices (corretora_id, contato_id, seguradora_id, ramo, numero, inicio_vigencia, fim_vigencia, forma_pagamento)
    values ('00000000-0000-0000-0000-0000000003c1','00000000-0000-0000-0000-0000000003d0',(select id from public.seguradoras order by nome limit 1),'Automóvel','DUP','2026-01-01','2027-01-01','boleto');
    raise exception 'FALHA: aceitou número duplicado';
  exception when unique_violation then
    if sqlerrm not like '%apolices_seguradora_numero_key%' then raise exception 'FALHA: constraint com nome inesperado: %', sqlerrm; end if;
  end;
end $$;
select 'ACTIONS DB OK' as resultado;
rollback;
```

Expected: `ACTIONS DB OK`.

- [ ] **Step 4: Commit**

```bash
git add app/lib/actions-seguros.ts
git commit -m "feat(seguros): server actions de apólices, endossos, parcelas e anexos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Lista de apólices + navegação

**Files:**
- Create: `app/corretoras/[corretoraId]/apolices/page.tsx`, `app/corretoras/[corretoraId]/apolices/ApolicesPage.tsx`
- Modify: `app/ui/design/Sidebar.tsx:18-30` (NAV_ITEMS e imports de ícones)

**Interfaces:**
- Consumes: `calcularStatusApolice`, `LABEL_STATUS_APOLICE`, `COR_STATUS_APOLICE`, `hojeSaoPaulo`, `formatData`, `ApoliceLinha`, `RAMOS_OPCOES`; `formatBRL` de `funis/constants.ts`.
- Produces: rota `/corretoras/[id]/apolices`; Sidebar com `apolices`, `sinistros`, `configuracoes` (as duas últimas rotas nascem nas Tasks 11 e 13).

- [ ] **Step 1: Sidebar**

Em `app/ui/design/Sidebar.tsx`, adicionar imports:

```ts
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
```

e trocar `NAV_ITEMS` por:

```ts
const NAV_ITEMS = [
    { href: 'funis', label: 'Funis', icon: ViewKanbanOutlinedIcon },
    { href: 'contatos', label: 'Contatos', icon: PeopleOutlinedIcon },
    { href: 'apolices', label: 'Apólices', icon: DescriptionOutlinedIcon },
    { href: 'sinistros', label: 'Sinistros', icon: ReportProblemOutlinedIcon },
    { href: 'configuracoes', label: 'Configurações', icon: SettingsOutlinedIcon },
];
```

- [ ] **Step 2: Página server**

Create `app/corretoras/[corretoraId]/apolices/page.tsx`:

```tsx
import { createClient } from "@/utils/supabase/server";
import { calcularStatusApolice } from "@/app/lib/seguros/status";
import { hojeSaoPaulo } from "@/app/lib/seguros/datas";
import type { ApoliceLinha } from "@/app/lib/seguros/types";
import ApolicesPage from "./ApolicesPage";

type LinhaBanco = {
    id: string;
    numero: string;
    ramo: string;
    inicio_vigencia: string;
    fim_vigencia: string;
    premio: number | null;
    cancelada_em: string | null;
    contato: { nome: string } | null;
    seguradora: { nome: string } | null;
    bens_auto: { placa: string | null; chassi: string | null }[];
    parcelas: { vencimento: string; status: string }[];
};

export default async function Page({ params }: { params: Promise<{ corretoraId: string }> }) {
    const { corretoraId } = await params;
    const supabase = await createClient();
    const hoje = hojeSaoPaulo();

    const { data } = await supabase
        .from("apolices")
        .select("id, numero, ramo, inicio_vigencia, fim_vigencia, premio, cancelada_em, contato:contatos(nome), seguradora:seguradoras(nome), bens_auto(placa, chassi), parcelas(vencimento, status)")
        .eq("corretora_id", corretoraId)
        .order("fim_vigencia", { ascending: true });

    const linhasBanco = (data ?? []) as unknown as LinhaBanco[];

    const { data: renovadasData } = await supabase
        .from("apolices")
        .select("apolice_anterior_id")
        .eq("corretora_id", corretoraId)
        .not("apolice_anterior_id", "is", null);
    const renovadas = new Set((renovadasData ?? []).map((r) => r.apolice_anterior_id as string));

    const linhas: ApoliceLinha[] = linhasBanco.map((a) => ({
        id: a.id,
        numero: a.numero,
        ramo: a.ramo,
        inicio_vigencia: a.inicio_vigencia,
        fim_vigencia: a.fim_vigencia,
        premio: a.premio,
        status: calcularStatusApolice({ canceladaEm: a.cancelada_em, fimVigencia: a.fim_vigencia, foiRenovada: renovadas.has(a.id), hoje }),
        contato_nome: a.contato?.nome ?? "—",
        seguradora_nome: a.seguradora?.nome ?? "—",
        placas: a.bens_auto.map((b) => b.placa ?? "").filter(Boolean),
        chassis: a.bens_auto.map((b) => b.chassi ?? "").filter(Boolean),
        proxima_parcela: a.parcelas
            .filter((p) => p.status === "aberta")
            .map((p) => p.vencimento)
            .sort()[0] ?? null,
    }));

    return <ApolicesPage corretoraId={corretoraId} apolices={linhas} hoje={hoje} />;
}
```

- [ ] **Step 3: Página client**

Create `app/corretoras/[corretoraId]/apolices/ApolicesPage.tsx`:

```tsx
'use client';
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import AddIcon from "@mui/icons-material/Add";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { COR_STATUS_APOLICE, LABEL_STATUS_APOLICE, type StatusApolice } from "@/app/lib/seguros/status";
import { formatData, somarDias } from "@/app/lib/seguros/datas";
import type { ApoliceLinha } from "@/app/lib/seguros/types";
import { formatBRL } from "../funis/constants";

export default function ApolicesPage({ corretoraId, apolices, hoje }: { corretoraId: string; apolices: ApoliceLinha[]; hoje: string }) {
    const router = useRouter();
    const [busca, setBusca] = useState("");
    const [ramo, setRamo] = useState("");
    const [seguradora, setSeguradora] = useState("");
    const [status, setStatus] = useState<StatusApolice | "">("");
    const [venceEm, setVenceEm] = useState("");

    const ramos = useMemo(() => [...new Set(apolices.map((a) => a.ramo))].sort(), [apolices]);
    const seguradoras = useMemo(() => [...new Set(apolices.map((a) => a.seguradora_nome))].sort(), [apolices]);

    const filtradas = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        const limite = venceEm ? somarDias(hoje, Number(venceEm)) : null;
        return apolices.filter((a) => {
            if (ramo && a.ramo !== ramo) return false;
            if (seguradora && a.seguradora_nome !== seguradora) return false;
            if (status && a.status !== status) return false;
            if (limite && (a.fim_vigencia < hoje || a.fim_vigencia > limite)) return false;
            if (!termo) return true;
            return [a.contato_nome, a.numero, ...a.placas, ...a.chassis].some((v) => v.toLowerCase().includes(termo));
        });
    }, [apolices, busca, ramo, seguradora, status, venceEm, hoje]);

    const colunas: GridColDef<ApoliceLinha>[] = [
        { field: "contato_nome", headerName: "Cliente", flex: 1.4 },
        { field: "seguradora_nome", headerName: "Seguradora", flex: 1 },
        { field: "ramo", headerName: "Ramo", flex: 1 },
        { field: "numero", headerName: "Número", flex: 1 },
        {
            field: "fim_vigencia", headerName: "Vigência", flex: 1.2,
            valueGetter: (_v, row) => `${formatData(row.inicio_vigencia)} – ${formatData(row.fim_vigencia)}`,
        },
        { field: "premio", headerName: "Prêmio", flex: 0.9, valueFormatter: (v: number | null) => (v == null ? "—" : formatBRL(v)) },
        {
            field: "status", headerName: "Status", flex: 0.9,
            renderCell: ({ row }) => <Chip size="small" label={LABEL_STATUS_APOLICE[row.status]} color={COR_STATUS_APOLICE[row.status]} />,
        },
        { field: "proxima_parcela", headerName: "Próx. parcela", flex: 0.9, valueFormatter: (v: string | null) => formatData(v) },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Apólices</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push(`/corretoras/${corretoraId}/apolices/nova`)}>
                    Nova apólice
                </Button>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }}>
                <TextField size="small" label="Buscar cliente, número, placa ou chassi" value={busca} onChange={(e) => setBusca(e.target.value)} sx={{ flex: 2 }} />
                <TextField size="small" select label="Ramo" value={ramo} onChange={(e) => setRamo(e.target.value)} sx={{ flex: 1 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {ramos.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Seguradora" value={seguradora} onChange={(e) => setSeguradora(e.target.value)} sx={{ flex: 1 }}>
                    <MenuItem value="">Todas</MenuItem>
                    {seguradoras.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusApolice | "")} sx={{ flex: 1 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {(Object.keys(LABEL_STATUS_APOLICE) as StatusApolice[]).map((s) => <MenuItem key={s} value={s}>{LABEL_STATUS_APOLICE[s]}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Vence em" value={venceEm} onChange={(e) => setVenceEm(e.target.value)} sx={{ flex: 1 }}>
                    <MenuItem value="">Qualquer data</MenuItem>
                    {[30, 60, 90].map((d) => <MenuItem key={d} value={String(d)}>Até {d} dias</MenuItem>)}
                </TextField>
            </Stack>

            <Paper variant="outlined">
                <DataGrid
                    rows={filtradas}
                    columns={colunas}
                    autoHeight
                    disableRowSelectionOnClick
                    onRowClick={({ row }) => router.push(`/corretoras/${corretoraId}/apolices/${row.id}`)}
                    initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                    pageSizeOptions={[25, 50, 100]}
                    localeText={{ noRowsLabel: "Nenhuma apólice encontrada" }}
                    sx={{ border: 0, "& .MuiDataGrid-row": { cursor: "pointer" } }}
                />
            </Paper>
        </Box>
    );
}
```

- [ ] **Step 4: Adicionar `somarDias` (teste primeiro)**

Em `app/lib/seguros/datas.test.ts`, acrescentar:

```ts
import { somarDias } from "./datas";

describe("somarDias", () => {
    it("soma dias atravessando mês e ano", () => {
        expect(somarDias("2026-12-20", 15)).toBe("2027-01-04");
        expect(somarDias("2026-10-02", 0)).toBe("2026-10-02");
    });
});
```

Run `npx -y pnpm@10 test` → FAIL (`somarDias` não exportado). Em `app/lib/seguros/datas.ts`, acrescentar:

```ts
export function somarDias(dataIso: string, dias: number): string {
    const [ano, mes, dia] = dataIso.slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}
```

Run `npx -y pnpm@10 test` → PASS.

- [ ] **Step 5: Verificar no navegador**

Run: `npx -y pnpm@10 build` (sem erros). Abrir preview `imsure-dev` (o Mitz precisa estar logado no painel), navegar para `/corretoras/<id>/apolices`.
Expected: título "Apólices", botão "Nova apólice", grade vazia com "Nenhuma apólice encontrada", Sidebar mostra Apólices/Sinistros/Configurações; console sem erros.

- [ ] **Step 6: Commit**

```bash
git add app/ui/design/Sidebar.tsx "app/corretoras/[corretoraId]/apolices" app/lib/seguros/datas.ts app/lib/seguros/datas.test.ts
git commit -m "feat(seguros): lista de apólices com filtros e navegação

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Formulário de apólice (nova e edição)

**Files:**
- Create: `app/corretoras/[corretoraId]/apolices/_components/ContatoPicker.tsx`, `BemSeguradoFields.tsx`, `VidasFields.tsx`, `CoberturasFields.tsx`, `ParcelasFields.tsx`, `ApoliceForm.tsx`, `carregarApolice.ts`
- Create: `app/corretoras/[corretoraId]/apolices/nova/page.tsx`, `app/corretoras/[corretoraId]/apolices/[apoliceId]/editar/page.tsx`

**Interfaces:**
- Consumes: `criarApolice`, `atualizarApolice` (Task 6); `buscarContatos` (`app/lib/actions.ts`, retorna `{ error, contatos: ContatoBusca[] }`); `gerarParcelas`, `diferencaCentavos`, `parseValorBR`, `tipoBemDoRamo`, `validarApoliceForm`, tipos (Tasks 1–2); `formatCpfCnpj`, `formatTelefone`, `cpfCnpjCompleto` de `funis/masks.ts`.
- Produces:
  - `<ApoliceForm corretoraId modo="criar" | "editar" apoliceId? inicial: ApoliceForm contatoInicial: ContatoResumo | null seguradoras: Seguradora[] ramos: string[] />`
  - `carregarApoliceForm(supabase, apoliceId): Promise<{ form: ApoliceForm; contato: ContatoResumo; corretoraId: string } | null>` (usada também pelo detalhe)
  - `formVazio(): ApoliceForm`

- [ ] **Step 1: Confirmar o contrato de `buscarContatos`**

Run: `sed -n 220,242p app/lib/actions.ts`
Expected: função recebe `{ corretoraId, query }` e devolve `{ error, contatos }` com `id, nome, telefone, email, cpf_cnpj, tipo_pessoa`. Se o nome do campo de retorno for outro, ajustar o `ContatoPicker` abaixo ao nome real.

- [ ] **Step 2: ContatoPicker**

Create `app/corretoras/[corretoraId]/apolices/_components/ContatoPicker.tsx`:

```tsx
'use client';
import { useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { buscarContatos } from "@/app/lib/actions";
import { formatCpfCnpj, formatTelefone } from "../../funis/masks";
import type { ContatoResumo, NovoContato } from "@/app/lib/seguros/types";

export default function ContatoPicker({
    corretoraId,
    contato,
    novoContato,
    onSelecionar,
    onNovoContato,
}: {
    corretoraId: string;
    contato: ContatoResumo | null;
    novoContato: NovoContato | null;
    onSelecionar: (c: ContatoResumo | null) => void;
    onNovoContato: (c: NovoContato | null) => void;
}) {
    const [termo, setTermo] = useState("");
    const [opcoes, setOpcoes] = useState<ContatoResumo[]>([]);

    useEffect(() => {
        if (termo.trim().length < 2) return;
        const t = setTimeout(async () => {
            const r = await buscarContatos({ corretoraId, query: termo.trim() });
            setOpcoes((r.contatos ?? []).map((c) => ({ id: c.id, nome: c.nome, cpf_cnpj: c.cpf_cnpj })));
        }, 250);
        return () => clearTimeout(t);
    }, [termo, corretoraId]);

    if (novoContato) {
        const digitos = (novoContato.cpfCnpj ?? "").replace(/\D/g, "");
        return (
            <Stack spacing={1.5}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField label="Nome do cliente" required value={novoContato.nome} onChange={(e) => onNovoContato({ ...novoContato, nome: e.target.value })} sx={{ flex: 2 }} />
                    <TextField
                        label="CPF/CNPJ"
                        value={formatCpfCnpj(novoContato.cpfCnpj ?? "")}
                        onChange={(e) => {
                            const d = e.target.value.replace(/\D/g, "").slice(0, 14);
                            onNovoContato({ ...novoContato, cpfCnpj: d || null, tipoPessoa: d.length > 11 ? "juridica" : "fisica" });
                        }}
                        helperText={digitos ? (digitos.length > 11 ? "Pessoa jurídica" : "Pessoa física") : " "}
                        sx={{ flex: 1 }}
                    />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField label="E-mail" value={novoContato.email ?? ""} onChange={(e) => onNovoContato({ ...novoContato, email: e.target.value || null })} sx={{ flex: 1 }} />
                    <TextField label="Telefone" value={formatTelefone(novoContato.telefone ?? "")} onChange={(e) => onNovoContato({ ...novoContato, telefone: e.target.value.replace(/\D/g, "").slice(0, 11) || null })} sx={{ flex: 1 }} />
                </Stack>
                <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => onNovoContato(null)}>Buscar contato existente</Button>
            </Stack>
        );
    }

    return (
        <Stack spacing={1}>
            <Autocomplete
                options={opcoes}
                value={contato}
                getOptionLabel={(o) => (o.cpf_cnpj ? `${o.nome} · ${formatCpfCnpj(o.cpf_cnpj)}` : o.nome)}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                filterOptions={(x) => x}
                onInputChange={(_e, v) => setTermo(v)}
                onChange={(_e, v) => onSelecionar(v)}
                noOptionsText={termo.trim().length < 2 ? "Digite ao menos 2 letras" : "Nenhum contato encontrado"}
                renderInput={(p) => <TextField {...p} label="Cliente" required />}
            />
            <Button
                size="small"
                sx={{ alignSelf: "flex-start" }}
                onClick={() => { onSelecionar(null); onNovoContato({ nome: termo, email: null, telefone: null, cpfCnpj: null, tipoPessoa: "fisica" }); }}
            >
                Cadastrar novo cliente
            </Button>
        </Stack>
    );
}
```

- [ ] **Step 3: Campos do bem segurado**

Create `app/corretoras/[corretoraId]/apolices/_components/VidasFields.tsx`:

```tsx
'use client';
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { validarPercentuaisBeneficiarios } from "@/app/lib/seguros/validacao";
import type { VidaSeguradaForm } from "@/app/lib/seguros/types";

const VIDA_VAZIA: VidaSeguradaForm = { nome: "", cpf: "", data_nascimento: null, beneficiarios: [] };

export default function VidasFields({ itens, onChange }: { itens: VidaSeguradaForm[]; onChange: (v: VidaSeguradaForm[]) => void }) {
    const atualizar = (i: number, v: Partial<VidaSeguradaForm>) => onChange(itens.map((x, j) => (j === i ? { ...x, ...v } : x)));

    return (
        <Stack spacing={2}>
            {itens.map((vida, i) => {
                const erro = validarPercentuaisBeneficiarios(vida.beneficiarios.map((b) => b.percentual));
                return (
                    <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={1.5}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: "center" }}>
                                <TextField label="Nome do segurado" required value={vida.nome} onChange={(e) => atualizar(i, { nome: e.target.value })} sx={{ flex: 2 }} />
                                <TextField label="CPF" value={vida.cpf} onChange={(e) => atualizar(i, { cpf: e.target.value.replace(/\D/g, "").slice(0, 11) })} sx={{ flex: 1 }} />
                                <TextField label="Nascimento" type="date" value={vida.data_nascimento ?? ""} onChange={(e) => atualizar(i, { data_nascimento: e.target.value || null })} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                                <IconButton aria-label="Remover vida" onClick={() => onChange(itens.filter((_, j) => j !== i))}><DeleteOutlineIcon /></IconButton>
                            </Stack>
                            <Typography variant="subtitle2">Beneficiários</Typography>
                            {vida.beneficiarios.map((b, k) => (
                                <Stack key={k} direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: "center" }}>
                                    <TextField size="small" label="Nome" value={b.nome} onChange={(e) => atualizar(i, { beneficiarios: vida.beneficiarios.map((x, y) => (y === k ? { ...x, nome: e.target.value } : x)) })} sx={{ flex: 2 }} />
                                    <TextField size="small" label="Parentesco" value={b.parentesco} onChange={(e) => atualizar(i, { beneficiarios: vida.beneficiarios.map((x, y) => (y === k ? { ...x, parentesco: e.target.value } : x)) })} sx={{ flex: 1 }} />
                                    <TextField size="small" label="%" type="number" value={b.percentual} onChange={(e) => atualizar(i, { beneficiarios: vida.beneficiarios.map((x, y) => (y === k ? { ...x, percentual: Number(e.target.value) } : x)) })} sx={{ width: 100 }} />
                                    <IconButton size="small" aria-label="Remover beneficiário" onClick={() => atualizar(i, { beneficiarios: vida.beneficiarios.filter((_, y) => y !== k) })}><DeleteOutlineIcon fontSize="small" /></IconButton>
                                </Stack>
                            ))}
                            {erro && vida.beneficiarios.length > 0 && <Alert severity="warning">{erro}</Alert>}
                            <Button size="small" startIcon={<AddIcon />} sx={{ alignSelf: "flex-start" }} onClick={() => atualizar(i, { beneficiarios: [...vida.beneficiarios, { nome: "", parentesco: "", percentual: 0 }] })}>
                                Adicionar beneficiário
                            </Button>
                        </Stack>
                    </Paper>
                );
            })}
            <Button startIcon={<AddIcon />} sx={{ alignSelf: "flex-start" }} onClick={() => onChange([...itens, VIDA_VAZIA])}>Adicionar vida segurada</Button>
        </Stack>
    );
}
```

Create `app/corretoras/[corretoraId]/apolices/_components/BemSeguradoFields.tsx`:

```tsx
'use client';
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import { parseValorBR } from "@/app/lib/seguros/datas";
import type { BemAutoForm, BemResidencialForm, BemRcForm, BemSeguradoForm } from "@/app/lib/seguros/types";
import VidasFields from "./VidasFields";

export const AUTO_VAZIO: BemAutoForm = { placa: "", chassi: "", marca: "", modelo: "", ano_fabricacao: null, ano_modelo: null, cep_pernoite: "" };
export const RESIDENCIAL_VAZIO: BemResidencialForm = { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", tipo_imovel: "casa" };
export const RC_VAZIO: BemRcForm = { atividade: "", limite: null };

const ano = (s: string) => (s ? Number(s.replace(/\D/g, "").slice(0, 4)) || null : null);

export default function BemSeguradoFields({ bem, onChange }: { bem: BemSeguradoForm; onChange: (b: BemSeguradoForm) => void }) {
    if (bem.tipo === "livre") {
        return <TextField label="Descrição do bem segurado" multiline minRows={2} value={bem.descricao} onChange={(e) => onChange({ tipo: "livre", descricao: e.target.value })} fullWidth />;
    }
    if (bem.tipo === "vida") {
        return <VidasFields itens={bem.itens} onChange={(itens) => onChange({ tipo: "vida", itens })} />;
    }
    if (bem.tipo === "auto") {
        const v = bem.itens[0] ?? AUTO_VAZIO;
        const set = (p: Partial<BemAutoForm>) => onChange({ tipo: "auto", itens: [{ ...v, ...p }] });
        return (
            <Stack spacing={1.5}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField label="Placa" value={v.placa} onChange={(e) => set({ placa: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7) })} sx={{ flex: 1 }} />
                    <TextField label="Chassi" value={v.chassi} onChange={(e) => set({ chassi: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17) })} sx={{ flex: 2 }} />
                    <TextField label="CEP de pernoite" value={v.cep_pernoite} onChange={(e) => set({ cep_pernoite: e.target.value.replace(/\D/g, "").slice(0, 8) })} sx={{ flex: 1 }} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField label="Marca" value={v.marca} onChange={(e) => set({ marca: e.target.value })} sx={{ flex: 1 }} />
                    <TextField label="Modelo" value={v.modelo} onChange={(e) => set({ modelo: e.target.value })} sx={{ flex: 2 }} />
                    <TextField label="Ano fabricação" value={v.ano_fabricacao ?? ""} onChange={(e) => set({ ano_fabricacao: ano(e.target.value) })} sx={{ flex: 1 }} />
                    <TextField label="Ano modelo" value={v.ano_modelo ?? ""} onChange={(e) => set({ ano_modelo: ano(e.target.value) })} sx={{ flex: 1 }} />
                </Stack>
            </Stack>
        );
    }
    if (bem.tipo === "residencial") {
        const v = bem.itens[0] ?? RESIDENCIAL_VAZIO;
        const set = (p: Partial<BemResidencialForm>) => onChange({ tipo: "residencial", itens: [{ ...v, ...p }] });
        return (
            <Stack spacing={1.5}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField label="CEP" value={v.cep} onChange={(e) => set({ cep: e.target.value.replace(/\D/g, "").slice(0, 8) })} sx={{ flex: 1 }} />
                    <TextField label="Logradouro" value={v.logradouro} onChange={(e) => set({ logradouro: e.target.value })} sx={{ flex: 3 }} />
                    <TextField label="Número" value={v.numero} onChange={(e) => set({ numero: e.target.value })} sx={{ flex: 1 }} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField label="Complemento" value={v.complemento} onChange={(e) => set({ complemento: e.target.value })} sx={{ flex: 1 }} />
                    <TextField label="Bairro" value={v.bairro} onChange={(e) => set({ bairro: e.target.value })} sx={{ flex: 1 }} />
                    <TextField label="Cidade" value={v.cidade} onChange={(e) => set({ cidade: e.target.value })} sx={{ flex: 1 }} />
                    <TextField label="UF" value={v.uf} onChange={(e) => set({ uf: e.target.value.toUpperCase().slice(0, 2) })} sx={{ width: 80 }} />
                    <TextField select label="Tipo de imóvel" value={v.tipo_imovel} onChange={(e) => set({ tipo_imovel: e.target.value as BemResidencialForm["tipo_imovel"] })} sx={{ flex: 1 }}>
                        <MenuItem value="casa">Casa</MenuItem>
                        <MenuItem value="apartamento">Apartamento</MenuItem>
                        <MenuItem value="condominio">Condomínio</MenuItem>
                        <MenuItem value="outro">Outro</MenuItem>
                    </TextField>
                </Stack>
            </Stack>
        );
    }
    const v = bem.itens[0] ?? RC_VAZIO;
    const set = (p: Partial<BemRcForm>) => onChange({ tipo: "rc", itens: [{ ...v, ...p }] });
    return (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField label="Atividade coberta" required value={v.atividade} onChange={(e) => set({ atividade: e.target.value })} sx={{ flex: 2 }} />
            <TextField label="Limite (R$)" value={v.limite != null ? String(v.limite).replace(".", ",") : ""} onChange={(e) => set({ limite: parseValorBR(e.target.value) })} sx={{ flex: 1 }} />
        </Stack>
    );
}
```

- [ ] **Step 4: Coberturas e parcelas**

Create `app/corretoras/[corretoraId]/apolices/_components/CoberturasFields.tsx`:

```tsx
'use client';
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { parseValorBR } from "@/app/lib/seguros/datas";
import type { CoberturaForm } from "@/app/lib/seguros/types";

const num = (n: number | null) => (n != null ? String(n).replace(".", ",") : "");

export default function CoberturasFields({ coberturas, onChange }: { coberturas: CoberturaForm[]; onChange: (c: CoberturaForm[]) => void }) {
    const set = (i: number, p: Partial<CoberturaForm>) => onChange(coberturas.map((c, j) => (j === i ? { ...c, ...p } : c)));
    return (
        <Stack spacing={1.5}>
            {coberturas.map((c, i) => (
                <Stack key={i} direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: "center" }}>
                    <TextField size="small" label="Cobertura" required value={c.nome} onChange={(e) => set(i, { nome: e.target.value })} sx={{ flex: 2 }} />
                    <TextField size="small" label="Importância segurada (R$)" value={num(c.importancia_segurada)} onChange={(e) => set(i, { importancia_segurada: parseValorBR(e.target.value) })} sx={{ flex: 1 }} />
                    <TextField size="small" label="Franquia (R$)" value={num(c.franquia)} onChange={(e) => set(i, { franquia: parseValorBR(e.target.value) })} sx={{ flex: 1 }} />
                    <IconButton size="small" aria-label="Remover cobertura" onClick={() => onChange(coberturas.filter((_, j) => j !== i))}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Stack>
            ))}
            <Button size="small" startIcon={<AddIcon />} sx={{ alignSelf: "flex-start" }} onClick={() => onChange([...coberturas, { nome: "", importancia_segurada: null, franquia: null }])}>
                Adicionar cobertura
            </Button>
        </Stack>
    );
}
```

Create `app/corretoras/[corretoraId]/apolices/_components/ParcelasFields.tsx`:

```tsx
'use client';
import { useState } from "react";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { gerarParcelas, diferencaCentavos } from "@/app/lib/seguros/parcelas";
import { parseValorBR } from "@/app/lib/seguros/datas";
import type { ParcelaForm } from "@/app/lib/seguros/types";
import { formatBRL } from "../../funis/constants";

const num = (n: number | null) => (n != null ? String(n).replace(".", ",") : "");

export default function ParcelasFields({
    parcelas,
    onChange,
    premio,
    percentualComissao,
    mostrarBoleto,
}: {
    parcelas: ParcelaForm[];
    onChange: (p: ParcelaForm[]) => void;
    premio: number | null;
    percentualComissao: number | null;
    mostrarBoleto: boolean;
}) {
    const [quantidade, setQuantidade] = useState("1");
    const [primeiro, setPrimeiro] = useState("");
    const [erro, setErro] = useState<string | null>(null);

    function gerar() {
        setErro(null);
        try {
            const geradas = gerarParcelas({ total: premio ?? 0, quantidade: Number(quantidade), primeiroVencimento: primeiro });
            onChange(geradas.map((g) => ({
                ...g,
                comissao_esperada: percentualComissao != null ? Math.round(g.valor * percentualComissao) / 100 : null,
                linha_digitavel: null,
                pix_copia_cola: null,
            })));
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Não foi possível gerar as parcelas");
        }
    }

    const set = (i: number, p: Partial<ParcelaForm>) => onChange(parcelas.map((x, j) => (j === i ? { ...x, ...p } : x)));
    const diferenca = diferencaCentavos(premio, parcelas.map((p) => p.valor));

    return (
        <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: "center" }}>
                <TextField size="small" label="Quantidade" type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} sx={{ width: 120 }} />
                <TextField size="small" label="1º vencimento" type="date" value={primeiro} onChange={(e) => setPrimeiro(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <Button variant="outlined" disabled={!premio || !primeiro} onClick={gerar}>Gerar parcelas</Button>
            </Stack>
            {erro && <Alert severity="error">{erro}</Alert>}
            {parcelas.map((p, i) => (
                <Stack key={i} direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ alignItems: "center" }}>
                    <TextField size="small" label="Nº" value={p.numero} sx={{ width: 70 }} slotProps={{ htmlInput: { readOnly: true } }} />
                    <TextField size="small" label="Vencimento" type="date" value={p.vencimento} onChange={(e) => set(i, { vencimento: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                    <TextField size="small" label="Valor (R$)" value={num(p.valor)} onChange={(e) => set(i, { valor: parseValorBR(e.target.value) ?? 0 })} sx={{ width: 130 }} />
                    <TextField size="small" label="Comissão esperada (R$)" value={num(p.comissao_esperada)} onChange={(e) => set(i, { comissao_esperada: parseValorBR(e.target.value) })} sx={{ width: 180 }} />
                    {mostrarBoleto && (
                        <>
                            <TextField size="small" label="Linha digitável" value={p.linha_digitavel ?? ""} onChange={(e) => set(i, { linha_digitavel: e.target.value || null })} sx={{ flex: 1 }} />
                            <TextField size="small" label="PIX copia e cola" value={p.pix_copia_cola ?? ""} onChange={(e) => set(i, { pix_copia_cola: e.target.value || null })} sx={{ flex: 1 }} />
                        </>
                    )}
                    <IconButton size="small" aria-label="Remover parcela" onClick={() => onChange(parcelas.filter((_, j) => j !== i).map((x, j) => ({ ...x, numero: j + 1 })))}>
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                </Stack>
            ))}
            {parcelas.length > 0 && diferenca !== 0 && (
                <Alert severity="info">
                    A soma das parcelas difere do prêmio em {formatBRL(Math.abs(diferenca) / 100)} ({diferenca > 0 ? "a mais" : "a menos"}). Pode ser juros do parcelamento — confira antes de salvar.
                </Alert>
            )}
        </Stack>
    );
}
```

- [ ] **Step 5: ApoliceForm**

Create `app/corretoras/[corretoraId]/apolices/_components/ApoliceForm.tsx`:

```tsx
'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { criarApolice, atualizarApolice } from "@/app/lib/actions-seguros";
import { tipoBemDoRamo } from "@/app/lib/seguros/ramos";
import { parseValorBR } from "@/app/lib/seguros/datas";
import { validarApoliceForm } from "@/app/lib/seguros/validacao";
import { LABEL_FORMA_PAGAMENTO, type ApoliceForm as ApoliceFormDados, type BemSeguradoForm, type ContatoResumo, type FormaPagamento, type Seguradora } from "@/app/lib/seguros/types";
import ContatoPicker from "./ContatoPicker";
import BemSeguradoFields, { AUTO_VAZIO, RC_VAZIO, RESIDENCIAL_VAZIO } from "./BemSeguradoFields";
import CoberturasFields from "./CoberturasFields";
import ParcelasFields from "./ParcelasFields";

export function bemVazioParaRamo(ramo: string): BemSeguradoForm {
    switch (tipoBemDoRamo(ramo)) {
        case "auto": return { tipo: "auto", itens: [AUTO_VAZIO] };
        case "residencial": return { tipo: "residencial", itens: [RESIDENCIAL_VAZIO] };
        case "rc": return { tipo: "rc", itens: [RC_VAZIO] };
        case "vida": return { tipo: "vida", itens: [] };
        default: return { tipo: "livre", descricao: "" };
    }
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{titulo}</Typography>
            {children}
        </Paper>
    );
}

const num = (n: number | null) => (n != null ? String(n).replace(".", ",") : "");

export default function ApoliceForm({
    corretoraId,
    modo,
    apoliceId,
    inicial,
    contatoInicial,
    seguradoras,
    ramos,
}: {
    corretoraId: string;
    modo: "criar" | "editar";
    apoliceId?: string;
    inicial: ApoliceFormDados;
    contatoInicial: ContatoResumo | null;
    seguradoras: Seguradora[];
    ramos: string[];
}) {
    const router = useRouter();
    const [form, setForm] = useState<ApoliceFormDados>(inicial);
    const [contato, setContato] = useState<ContatoResumo | null>(contatoInicial);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const set = (p: Partial<ApoliceFormDados>) => setForm((f) => ({ ...f, ...p }));

    function trocarRamo(ramo: string) {
        const mesmoTipo = tipoBemDoRamo(ramo) === form.bem.tipo;
        set({ ramo, bem: mesmoTipo ? form.bem : bemVazioParaRamo(ramo) });
    }

    async function salvar() {
        setErro(null);
        const dados = { ...form, contatoId: contato?.id ?? null };
        const erroLocal = validarApoliceForm(modo === "editar" ? { ...dados, parcelas: [] } : dados);
        if (erroLocal) { setErro(erroLocal); return; }

        setSalvando(true);
        if (modo === "criar") {
            const r = await criarApolice({ corretoraId, dados });
            setSalvando(false);
            if (r.error || !r.apoliceId) { setErro(r.error ?? "Erro ao salvar"); return; }
            router.push(`/corretoras/${corretoraId}/apolices/${r.apoliceId}`);
        } else {
            const r = await atualizarApolice({ apoliceId: apoliceId!, dados });
            setSalvando(false);
            if (r.error) { setErro(r.error); return; }
            router.push(`/corretoras/${corretoraId}/apolices/${apoliceId}`);
            router.refresh();
        }
    }

    const seguradoraSelecionada = seguradoras.find((s) => s.id === form.seguradoraId) ?? null;
    const opcoesRamo = form.ramo && !ramos.includes(form.ramo) ? [...ramos, form.ramo] : ramos;

    return (
        <Box sx={{ p: 3, maxWidth: 1100 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 1 }}>Voltar</Button>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>{modo === "criar" ? "Nova apólice" : `Editar apólice ${inicial.numero}`}</Typography>

            <Stack spacing={2}>
                <Secao titulo="Cliente">
                    <ContatoPicker
                        corretoraId={corretoraId}
                        contato={contato}
                        novoContato={form.novoContato}
                        onSelecionar={setContato}
                        onNovoContato={(c) => set({ novoContato: c })}
                    />
                </Secao>

                <Secao titulo="Dados da apólice">
                    <Stack spacing={1.5}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <Autocomplete
                                options={seguradoras}
                                value={seguradoraSelecionada}
                                getOptionLabel={(s) => s.nome}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                onChange={(_e, s) => set({ seguradoraId: s?.id ?? "" })}
                                renderInput={(p) => <TextField {...p} label="Seguradora" required />}
                                sx={{ flex: 1 }}
                            />
                            <TextField select label="Ramo" required value={form.ramo} onChange={(e) => trocarRamo(e.target.value)} sx={{ flex: 1 }}>
                                {opcoesRamo.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                            </TextField>
                            <TextField label="Número da apólice" required value={form.numero} onChange={(e) => set({ numero: e.target.value })} sx={{ flex: 1 }} />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField label="Início da vigência" type="date" required value={form.inicioVigencia} onChange={(e) => set({ inicioVigencia: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                            <TextField label="Fim da vigência" type="date" required value={form.fimVigencia} onChange={(e) => set({ fimVigencia: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                            <TextField label="Prêmio total (R$)" value={num(form.premio)} onChange={(e) => set({ premio: parseValorBR(e.target.value) })} sx={{ flex: 1 }} />
                            <TextField label="Comissão (%)" value={num(form.percentualComissao)} onChange={(e) => set({ percentualComissao: parseValorBR(e.target.value) })} sx={{ flex: 1 }} />
                            <TextField select label="Forma de pagamento" value={form.formaPagamento} onChange={(e) => set({ formaPagamento: e.target.value as FormaPagamento })} sx={{ flex: 1 }}>
                                {(Object.keys(LABEL_FORMA_PAGAMENTO) as FormaPagamento[]).map((f) => <MenuItem key={f} value={f}>{LABEL_FORMA_PAGAMENTO[f]}</MenuItem>)}
                            </TextField>
                        </Stack>
                    </Stack>
                </Secao>

                {form.ramo && (
                    <Secao titulo="Bem segurado">
                        <BemSeguradoFields bem={form.bem} onChange={(bem) => set({ bem })} />
                    </Secao>
                )}

                <Secao titulo="Coberturas">
                    <CoberturasFields coberturas={form.coberturas} onChange={(coberturas) => set({ coberturas })} />
                </Secao>

                {modo === "criar" && (
                    <Secao titulo="Parcelas">
                        <ParcelasFields
                            parcelas={form.parcelas}
                            onChange={(parcelas) => set({ parcelas })}
                            premio={form.premio}
                            percentualComissao={form.percentualComissao}
                            mostrarBoleto={form.formaPagamento === "boleto"}
                        />
                    </Secao>
                )}

                {erro && <Alert severity="error">{erro}</Alert>}
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end" }}>
                    <Button onClick={() => router.back()}>Cancelar</Button>
                    <Button variant="contained" disabled={salvando} onClick={salvar}>{salvando ? "Salvando..." : "Salvar apólice"}</Button>
                </Stack>
            </Stack>
        </Box>
    );
}
```

- [ ] **Step 6: Carregamento compartilhado**

Create `app/corretoras/[corretoraId]/apolices/_components/carregarApolice.ts`:

```ts
import type { createClient } from "@/utils/supabase/server";
import { tipoBemDoRamo } from "@/app/lib/seguros/ramos";
import type { ApoliceForm, BemSeguradoForm, ContatoResumo, FormaPagamento } from "@/app/lib/seguros/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export function formVazio(): ApoliceForm {
    return {
        contatoId: null, novoContato: null, seguradoraId: "", ramo: "", numero: "",
        inicioVigencia: "", fimVigencia: "", premio: null, percentualComissao: null,
        formaPagamento: "boleto", negocioOrigemId: null, apoliceAnteriorId: null,
        bem: { tipo: "livre", descricao: "" }, coberturas: [], parcelas: [],
    };
}

export async function carregarApoliceForm(supabase: Supabase, apoliceId: string): Promise<{ form: ApoliceForm; contato: ContatoResumo; corretoraId: string } | null> {
    const { data: a } = await supabase
        .from("apolices")
        .select("*, contato:contatos(id, nome, cpf_cnpj)")
        .eq("id", apoliceId)
        .maybeSingle();
    if (!a) return null;

    const ramo = a.ramo as string;
    const tipo = tipoBemDoRamo(ramo);
    let bem: BemSeguradoForm = { tipo: "livre", descricao: (a.descricao_bem as string | null) ?? "" };

    if (tipo === "auto") {
        const { data } = await supabase.from("bens_auto").select("*").eq("apolice_id", apoliceId);
        bem = {
            tipo: "auto",
            itens: (data ?? []).map((b) => ({
                placa: b.placa ?? "", chassi: b.chassi ?? "", marca: b.marca ?? "", modelo: b.modelo ?? "",
                ano_fabricacao: b.ano_fabricacao ?? null, ano_modelo: b.ano_modelo ?? null, cep_pernoite: b.cep_pernoite ?? "",
            })),
        };
    } else if (tipo === "residencial") {
        const { data } = await supabase.from("bens_residencial").select("*").eq("apolice_id", apoliceId);
        bem = {
            tipo: "residencial",
            itens: (data ?? []).map((b) => ({
                cep: b.cep ?? "", logradouro: b.logradouro ?? "", numero: b.numero ?? "", complemento: b.complemento ?? "",
                bairro: b.bairro ?? "", cidade: b.cidade ?? "", uf: b.uf ?? "", tipo_imovel: b.tipo_imovel ?? "casa",
            })),
        };
    } else if (tipo === "rc") {
        const { data } = await supabase.from("bens_rc").select("atividade, limite").eq("apolice_id", apoliceId);
        bem = { tipo: "rc", itens: (data ?? []).map((b) => ({ atividade: b.atividade as string, limite: b.limite as number | null })) };
    } else if (tipo === "vida") {
        const { data } = await supabase.from("vidas_seguradas").select("nome, cpf, data_nascimento, beneficiarios(nome, parentesco, percentual)").eq("apolice_id", apoliceId);
        bem = {
            tipo: "vida",
            itens: (data ?? []).map((v) => ({
                nome: v.nome as string,
                cpf: (v.cpf as string | null) ?? "",
                data_nascimento: v.data_nascimento as string | null,
                beneficiarios: ((v.beneficiarios ?? []) as { nome: string; parentesco: string | null; percentual: number }[])
                    .map((b) => ({ nome: b.nome, parentesco: b.parentesco ?? "", percentual: Number(b.percentual) })),
            })),
        };
    }

    const { data: coberturas } = await supabase
        .from("coberturas")
        .select("nome, importancia_segurada, franquia")
        .eq("apolice_id", apoliceId)
        .is("endosso_id", null)
        .order("criado_em");

    const contato = a.contato as ContatoResumo;
    return {
        corretoraId: a.corretora_id as string,
        contato,
        form: {
            contatoId: contato.id,
            novoContato: null,
            seguradoraId: a.seguradora_id as string,
            ramo,
            numero: a.numero as string,
            inicioVigencia: a.inicio_vigencia as string,
            fimVigencia: a.fim_vigencia as string,
            premio: a.premio as number | null,
            percentualComissao: a.percentual_comissao as number | null,
            formaPagamento: a.forma_pagamento as FormaPagamento,
            negocioOrigemId: a.negocio_origem_id as string | null,
            apoliceAnteriorId: a.apolice_anterior_id as string | null,
            bem,
            coberturas: (coberturas ?? []).map((c) => ({ nome: c.nome as string, importancia_segurada: c.importancia_segurada as number | null, franquia: c.franquia as number | null })),
            parcelas: [],
        },
    };
}
```

- [ ] **Step 7: Páginas nova e editar**

Create `app/corretoras/[corretoraId]/apolices/nova/page.tsx`:

```tsx
import { createClient } from "@/utils/supabase/server";
import { RAMOS_OPCOES } from "@/app/lib/seguros/ramos";
import type { ContatoResumo, Seguradora } from "@/app/lib/seguros/types";
import ApoliceForm, { bemVazioParaRamo } from "../_components/ApoliceForm";
import { formVazio } from "../_components/carregarApolice";

export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ corretoraId: string }>;
    searchParams: Promise<{ negocioId?: string }>;
}) {
    const { corretoraId } = await params;
    const { negocioId } = await searchParams;
    const supabase = await createClient();

    const [{ data: seguradoras }, { data: corretora }] = await Promise.all([
        supabase.from("seguradoras").select("id, nome, telefone_assistencia, telefone_sinistro").eq("ativa", true).order("nome"),
        supabase.from("corretoras").select("ramos_atuacao").eq("id", corretoraId).single(),
    ]);
    const listaSeguradoras = (seguradoras ?? []) as Seguradora[];
    const ramosCorretora = (corretora?.ramos_atuacao as string[] | null) ?? [];
    const ramos = ramosCorretora.length ? ramosCorretora : [...RAMOS_OPCOES];

    const inicial = formVazio();
    let contatoInicial: ContatoResumo | null = null;

    if (negocioId) {
        const { data: n } = await supabase
            .from("negocios")
            .select("id, ramo, seguradora, valor, apolice_renovada_id, contato:contatos(id, nome, cpf_cnpj)")
            .eq("id", negocioId)
            .maybeSingle();
        if (n) {
            contatoInicial = n.contato as unknown as ContatoResumo;
            const seg = listaSeguradoras.find((s) => s.nome.toLowerCase() === ((n.seguradora as string | null) ?? "").toLowerCase());
            Object.assign(inicial, {
                contatoId: contatoInicial.id,
                ramo: n.ramo as string,
                seguradoraId: seg?.id ?? "",
                premio: n.valor as number | null,
                negocioOrigemId: n.id as string,
                apoliceAnteriorId: (n.apolice_renovada_id as string | null) ?? null,
                bem: bemVazioParaRamo(n.ramo as string),
            });
        }
    }

    return <ApoliceForm corretoraId={corretoraId} modo="criar" inicial={inicial} contatoInicial={contatoInicial} seguradoras={listaSeguradoras} ramos={ramos} />;
}
```

Create `app/corretoras/[corretoraId]/apolices/[apoliceId]/editar/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { RAMOS_OPCOES } from "@/app/lib/seguros/ramos";
import type { Seguradora } from "@/app/lib/seguros/types";
import ApoliceForm from "../../_components/ApoliceForm";
import { carregarApoliceForm } from "../../_components/carregarApolice";

export default async function Page({ params }: { params: Promise<{ corretoraId: string; apoliceId: string }> }) {
    const { corretoraId, apoliceId } = await params;
    const supabase = await createClient();

    const carregado = await carregarApoliceForm(supabase, apoliceId);
    if (!carregado || carregado.corretoraId !== corretoraId) notFound();

    const [{ data: seguradoras }, { data: corretora }] = await Promise.all([
        supabase.from("seguradoras").select("id, nome, telefone_assistencia, telefone_sinistro").order("nome"),
        supabase.from("corretoras").select("ramos_atuacao").eq("id", corretoraId).single(),
    ]);
    const ramosCorretora = (corretora?.ramos_atuacao as string[] | null) ?? [];

    return (
        <ApoliceForm
            corretoraId={corretoraId}
            modo="editar"
            apoliceId={apoliceId}
            inicial={carregado.form}
            contatoInicial={carregado.contato}
            seguradoras={(seguradoras ?? []) as Seguradora[]}
            ramos={ramosCorretora.length ? ramosCorretora : [...RAMOS_OPCOES]}
        />
    );
}
```

- [ ] **Step 8: Build e verificação no navegador**

Run: `npx -y pnpm@10 build && npx -y pnpm@10 lint` → sem erros.
No preview, em `/corretoras/<id>/apolices/nova`: escolher cliente existente, seguradora "Porto Seguro", ramo "Automóvel", número `TESTE-001`, vigência 01/01/2026–01/01/2027, prêmio `1200`, comissão `15`, placa `ABC1D23`, cobertura "Casco" com franquia `3500`, gerar 3 parcelas a partir de 31/01/2026, salvar.
Expected: redireciona para `/apolices/<id>` (rota criada na Task 9 — até lá, 404 é esperado; confirmar via `execute_sql` que `select numero, (select count(*) from parcelas p where p.apolice_id = a.id) from apolices a where numero = 'TESTE-001'` retorna 3 parcelas). Salvar de novo com o mesmo número → alerta "Já existe uma apólice com esse número nessa seguradora."

- [ ] **Step 9: Commit**

```bash
git add "app/corretoras/[corretoraId]/apolices"
git commit -m "feat(seguros): formulário de apólice com bem segurado, coberturas e parcelas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Detalhe da apólice (resumo, parcelas, endossos, sinistros, anexos)

**Files:**
- Create: `app/corretoras/[corretoraId]/apolices/[apoliceId]/page.tsx`, `ApoliceDetail.tsx`, `app/corretoras/[corretoraId]/apolices/_components/ParcelasTab.tsx`, `EndossosTab.tsx`, `AnexosApoliceTab.tsx`

**Interfaces:**
- Consumes: `carregarApoliceForm`, `cancelarApolice`, `atualizarParcela`, `darBaixaManual`, `adicionarParcelas`, `criarEndosso`, `listarAnexosApolice`, `uploadAnexoApolice`, `deletarAnexoApolice`, `ParcelasFields`, `CoberturasFields`, labels/tipos.
- Produces: rota `/corretoras/[id]/apolices/[apoliceId]` (com `?aba=parcelas|endossos|sinistros|anexos`). `<AnexosApoliceTab apoliceId sinistroId? andamentoId? />` reaproveitado na Task 11.

- [ ] **Step 1: Página server**

Create `app/corretoras/[corretoraId]/apolices/[apoliceId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { calcularStatusApolice } from "@/app/lib/seguros/status";
import { hojeSaoPaulo } from "@/app/lib/seguros/datas";
import type { Cobertura, Endosso, Parcela, SinistroLinha } from "@/app/lib/seguros/types";
import { carregarApoliceForm } from "../_components/carregarApolice";
import ApoliceDetail from "./ApoliceDetail";

export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ corretoraId: string; apoliceId: string }>;
    searchParams: Promise<{ aba?: string }>;
}) {
    const { corretoraId, apoliceId } = await params;
    const { aba } = await searchParams;
    const supabase = await createClient();

    const carregado = await carregarApoliceForm(supabase, apoliceId);
    if (!carregado || carregado.corretoraId !== corretoraId) notFound();

    const [{ data: extra }, { data: renovacao }, { data: parcelas }, { data: endossos }, { data: coberturasEndosso }, { data: sinistros }] = await Promise.all([
        supabase.from("apolices").select("cancelada_em, seguradora:seguradoras(nome, telefone_assistencia, telefone_sinistro)").eq("id", apoliceId).single(),
        supabase.from("apolices").select("id, numero").eq("apolice_anterior_id", apoliceId).maybeSingle(),
        supabase.from("parcelas").select("id, endosso_id, numero, vencimento, valor, comissao_esperada, status, baixa_origem, baixa_em, linha_digitavel, pix_copia_cola").eq("apolice_id", apoliceId).order("vencimento"),
        supabase.from("endossos").select("id, numero, tipo, data_emissao, descricao, valor").eq("apolice_id", apoliceId).order("criado_em"),
        supabase.from("coberturas").select("id, endosso_id, nome, importancia_segurada, franquia").eq("apolice_id", apoliceId).not("endosso_id", "is", null),
        supabase.from("sinistros").select("id, data_ocorrencia, tipo, status, numero_seguradora").eq("apolice_id", apoliceId).order("data_ocorrencia", { ascending: false }),
    ]);

    let anterior: { id: string; numero: string } | null = null;
    if (carregado.form.apoliceAnteriorId) {
        const { data } = await supabase.from("apolices").select("id, numero").eq("id", carregado.form.apoliceAnteriorId).maybeSingle();
        anterior = data as { id: string; numero: string } | null;
    }

    const status = calcularStatusApolice({
        canceladaEm: (extra?.cancelada_em as string | null) ?? null,
        fimVigencia: carregado.form.fimVigencia,
        foiRenovada: !!renovacao,
        hoje: hojeSaoPaulo(),
    });

    const sinistrosLinhas: SinistroLinha[] = (sinistros ?? []).map((s) => ({
        id: s.id as string,
        apolice_id: apoliceId,
        apolice_numero: carregado.form.numero,
        ramo: carregado.form.ramo,
        contato_nome: carregado.contato.nome,
        data_ocorrencia: s.data_ocorrencia as string,
        tipo: s.tipo as string,
        status: s.status as SinistroLinha["status"],
        numero_seguradora: s.numero_seguradora as string | null,
    }));

    return (
        <ApoliceDetail
            corretoraId={corretoraId}
            apoliceId={apoliceId}
            form={carregado.form}
            contato={carregado.contato}
            seguradora={extra?.seguradora as unknown as { nome: string; telefone_assistencia: string | null; telefone_sinistro: string | null }}
            canceladaEm={(extra?.cancelada_em as string | null) ?? null}
            status={status}
            anterior={anterior}
            renovacao={renovacao as { id: string; numero: string } | null}
            parcelas={(parcelas ?? []) as Parcela[]}
            endossos={(endossos ?? []) as Endosso[]}
            coberturasEndosso={(coberturasEndosso ?? []) as Cobertura[]}
            sinistros={sinistrosLinhas}
            abaInicial={aba ?? "resumo"}
        />
    );
}
```

- [ ] **Step 2: Aba de parcelas**

Create `app/corretoras/[corretoraId]/apolices/_components/ParcelasTab.tsx`:

```tsx
'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { atualizarParcela, darBaixaManual } from "@/app/lib/actions-seguros";
import { formatData, parseValorBR } from "@/app/lib/seguros/datas";
import { LABEL_STATUS_PARCELA, type Endosso, type Parcela } from "@/app/lib/seguros/types";
import { formatBRL } from "../../funis/constants";

const COR = { aberta: "default", paga: "success", comissao_recebida: "info" } as const;
const num = (n: number | null) => (n != null ? String(n).replace(".", ",") : "");

export default function ParcelasTab({ parcelas, endossos, mostrarBoleto }: { parcelas: Parcela[]; endossos: Endosso[]; mostrarBoleto: boolean }) {
    const router = useRouter();
    const [editando, setEditando] = useState<Parcela | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const nomeEndosso = (id: string | null) => (id ? `Endosso ${endossos.find((e) => e.id === id)?.numero ?? ""}` : "Apólice");

    async function baixa(p: Parcela) {
        setErro(null);
        const r = await darBaixaManual({ parcelaId: p.id, desfazer: p.status !== "aberta" });
        if (r.error) setErro(r.error); else router.refresh();
    }

    async function salvarEdicao() {
        if (!editando) return;
        const r = await atualizarParcela({
            parcelaId: editando.id,
            dados: {
                vencimento: editando.vencimento,
                valor: editando.valor,
                comissao_esperada: editando.comissao_esperada,
                linha_digitavel: editando.linha_digitavel,
                pix_copia_cola: editando.pix_copia_cola,
            },
        });
        if (r.error) { setErro(r.error); return; }
        setEditando(null);
        router.refresh();
    }

    if (!parcelas.length) return <Typography color="text.secondary">Nenhuma parcela cadastrada.</Typography>;

    return (
        <Stack spacing={1.5}>
            {erro && <Alert severity="error">{erro}</Alert>}
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Origem</TableCell><TableCell>Nº</TableCell><TableCell>Vencimento</TableCell>
                        <TableCell>Valor</TableCell><TableCell>Comissão esperada</TableCell><TableCell>Status</TableCell><TableCell align="right">Ações</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {parcelas.map((p) => (
                        <TableRow key={p.id}>
                            <TableCell>{nomeEndosso(p.endosso_id)}</TableCell>
                            <TableCell>{p.numero}</TableCell>
                            <TableCell>{formatData(p.vencimento)}</TableCell>
                            <TableCell>{formatBRL(p.valor)}</TableCell>
                            <TableCell>{p.comissao_esperada != null ? formatBRL(p.comissao_esperada) : "—"}</TableCell>
                            <TableCell>
                                <Chip size="small" color={COR[p.status]} label={LABEL_STATUS_PARCELA[p.status] + (p.baixa_origem === "manual" ? " (manual)" : "")} />
                            </TableCell>
                            <TableCell align="right">
                                <Button size="small" onClick={() => setEditando(p)}>Editar</Button>
                                {p.baixa_origem !== "extrato" && (
                                    <Button size="small" onClick={() => baixa(p)}>{p.status === "aberta" ? "Dar baixa" : "Desfazer baixa"}</Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={!!editando} onClose={() => setEditando(null)} fullWidth maxWidth="sm">
                <DialogTitle>Editar parcela {editando?.numero}</DialogTitle>
                {editando && (
                    <DialogContent>
                        <Stack spacing={1.5} sx={{ mt: 1 }}>
                            <TextField label="Vencimento" type="date" value={editando.vencimento} onChange={(e) => setEditando({ ...editando, vencimento: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                            <TextField label="Valor (R$)" value={num(editando.valor)} onChange={(e) => setEditando({ ...editando, valor: parseValorBR(e.target.value) ?? 0 })} />
                            <TextField label="Comissão esperada (R$)" value={num(editando.comissao_esperada)} onChange={(e) => setEditando({ ...editando, comissao_esperada: parseValorBR(e.target.value) })} />
                            {mostrarBoleto && (
                                <>
                                    <TextField label="Linha digitável" value={editando.linha_digitavel ?? ""} onChange={(e) => setEditando({ ...editando, linha_digitavel: e.target.value || null })} />
                                    <TextField label="PIX copia e cola" value={editando.pix_copia_cola ?? ""} onChange={(e) => setEditando({ ...editando, pix_copia_cola: e.target.value || null })} />
                                </>
                            )}
                        </Stack>
                    </DialogContent>
                )}
                <DialogActions>
                    <Button onClick={() => setEditando(null)}>Cancelar</Button>
                    <Button variant="contained" onClick={salvarEdicao}>Salvar</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
```

- [ ] **Step 3: Aba de endossos**

Create `app/corretoras/[corretoraId]/apolices/_components/EndossosTab.tsx`:

```tsx
'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import { criarEndosso } from "@/app/lib/actions-seguros";
import { formatData, parseValorBR } from "@/app/lib/seguros/datas";
import { LABEL_TIPO_ENDOSSO, type Cobertura, type CoberturaForm, type Endosso, type ParcelaForm, type TipoEndosso } from "@/app/lib/seguros/types";
import { formatBRL } from "../../funis/constants";
import CoberturasFields from "./CoberturasFields";
import ParcelasFields from "./ParcelasFields";

export default function EndossosTab({
    apoliceId,
    endossos,
    coberturasEndosso,
    percentualComissao,
    mostrarBoleto,
}: {
    apoliceId: string;
    endossos: Endosso[];
    coberturasEndosso: Cobertura[];
    percentualComissao: number | null;
    mostrarBoleto: boolean;
}) {
    const router = useRouter();
    const [aberto, setAberto] = useState(false);
    const [numero, setNumero] = useState("");
    const [tipo, setTipo] = useState<TipoEndosso>("alteracao_bem");
    const [dataEmissao, setDataEmissao] = useState("");
    const [descricao, setDescricao] = useState("");
    const [valor, setValor] = useState("");
    const [coberturas, setCoberturas] = useState<CoberturaForm[]>([]);
    const [parcelas, setParcelas] = useState<ParcelaForm[]>([]);
    const [erro, setErro] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);

    function limpar() {
        setNumero(""); setTipo("alteracao_bem"); setDataEmissao(""); setDescricao(""); setValor(""); setCoberturas([]); setParcelas([]); setErro(null);
    }

    const valorAbs = parseValorBR(valor);
    const valorFinal = valorAbs != null && valor.trim().startsWith("-") ? -valorAbs : valorAbs;

    async function salvar() {
        setSalvando(true);
        const r = await criarEndosso({
            apoliceId, numero, tipo,
            dataEmissao: dataEmissao || null,
            descricao: descricao || null,
            valor: valorFinal,
            coberturas, parcelas,
        });
        setSalvando(false);
        if (r.error) { setErro(r.error); return; }
        setAberto(false);
        limpar();
        router.refresh();
    }

    return (
        <Stack spacing={1.5}>
            <Button startIcon={<AddIcon />} variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => setAberto(true)}>Novo endosso</Button>
            {!endossos.length && <Typography color="text.secondary">Nenhum endosso nesta apólice.</Typography>}
            {endossos.map((e) => (
                <Paper key={e.id} variant="outlined" sx={{ p: 2 }}>
                    <Typography sx={{ fontWeight: 700 }}>Endosso {e.numero} · {LABEL_TIPO_ENDOSSO[e.tipo]}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Emissão {formatData(e.data_emissao)} · Valor {e.valor != null ? formatBRL(e.valor) : "—"}
                    </Typography>
                    {e.descricao && <Typography variant="body2" sx={{ mt: 1 }}>{e.descricao}</Typography>}
                    {coberturasEndosso.filter((c) => c.endosso_id === e.id).map((c) => (
                        <Typography key={c.id} variant="body2">
                            • {c.nome}{c.importancia_segurada != null ? ` — IS ${formatBRL(c.importancia_segurada)}` : ""}{c.franquia != null ? ` — franquia ${formatBRL(c.franquia)}` : ""}
                        </Typography>
                    ))}
                </Paper>
            ))}

            <Dialog open={aberto} onClose={() => setAberto(false)} fullWidth maxWidth="md">
                <DialogTitle>Novo endosso</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField label="Número do endosso" required value={numero} onChange={(e) => setNumero(e.target.value)} sx={{ flex: 1 }} />
                            <TextField select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoEndosso)} sx={{ flex: 1 }}>
                                {(Object.keys(LABEL_TIPO_ENDOSSO) as TipoEndosso[]).map((t) => <MenuItem key={t} value={t}>{LABEL_TIPO_ENDOSSO[t]}</MenuItem>)}
                            </TextField>
                            <TextField label="Emissão" type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                            <TextField label="Valor (R$)" value={valor} onChange={(e) => setValor(e.target.value)} helperText="Negativo se for restituição" sx={{ flex: 1 }} />
                        </Stack>
                        <TextField label="Descrição" multiline minRows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                        <Typography variant="subtitle2">Coberturas do endosso</Typography>
                        <CoberturasFields coberturas={coberturas} onChange={setCoberturas} />
                        <Typography variant="subtitle2">Parcelas do endosso</Typography>
                        <ParcelasFields parcelas={parcelas} onChange={setParcelas} premio={valorAbs} percentualComissao={percentualComissao} mostrarBoleto={mostrarBoleto} />
                        {erro && <Alert severity="error">{erro}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAberto(false)}>Cancelar</Button>
                    <Button variant="contained" disabled={salvando} onClick={salvar}>{salvando ? "Salvando..." : "Salvar endosso"}</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
```

- [ ] **Step 4: Aba de anexos**

Create `app/corretoras/[corretoraId]/apolices/_components/AnexosApoliceTab.tsx`:

```tsx
'use client';
import { useCallback, useEffect, useRef, useState } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { deletarAnexoApolice, listarAnexosApolice, uploadAnexoApolice } from "@/app/lib/actions-seguros";
import { formatData } from "@/app/lib/seguros/datas";
import type { AnexoApolice } from "@/app/lib/seguros/types";

export default function AnexosApoliceTab({
    apoliceId,
    sinistroId = null,
    andamentoId = null,
    versao = 0,
}: {
    apoliceId: string;
    sinistroId?: string | null;
    andamentoId?: string | null;
    versao?: number;
}) {
    const [anexos, setAnexos] = useState<AnexoApolice[]>([]);
    const [erro, setErro] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    const carregar = useCallback(async () => {
        const r = await listarAnexosApolice({ apoliceId, sinistroId });
        if (r.error) setErro(r.error); else setAnexos(r.anexos);
    }, [apoliceId, sinistroId]);

    useEffect(() => { carregar(); }, [carregar, versao]);

    async function enviar(arquivo: File) {
        setErro(null);
        setEnviando(true);
        const fd = new FormData();
        fd.set("apoliceId", apoliceId);
        fd.set("arquivo", arquivo);
        if (sinistroId) fd.set("sinistroId", sinistroId);
        if (andamentoId) fd.set("andamentoId", andamentoId);
        const r = await uploadAnexoApolice(fd);
        setEnviando(false);
        if (r.error) setErro(r.error); else carregar();
    }

    async function remover(id: string) {
        const r = await deletarAnexoApolice({ anexoId: id });
        if (r.error) setErro(r.error); else carregar();
    }

    return (
        <Stack spacing={1.5}>
            <input ref={input} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); e.target.value = ""; }} />
            <Button startIcon={<UploadFileIcon />} variant="outlined" disabled={enviando} sx={{ alignSelf: "flex-start" }} onClick={() => input.current?.click()}>
                {enviando ? "Enviando..." : "Enviar arquivo"}
            </Button>
            {erro && <Alert severity="error">{erro}</Alert>}
            {!anexos.length && <Typography color="text.secondary">Nenhum arquivo.</Typography>}
            {anexos.map((a) => (
                <Stack key={a.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {a.url ? <Link href={a.url} target="_blank" rel="noreferrer">{a.nome_arquivo}</Link> : <Typography>{a.nome_arquivo}</Typography>}
                    <Typography variant="caption" color="text.secondary">{a.usuario_nome} · {formatData(a.criado_em)}</Typography>
                    <IconButton size="small" aria-label="Remover arquivo" onClick={() => remover(a.id)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Stack>
            ))}
        </Stack>
    );
}
```

- [ ] **Step 5: ApoliceDetail**

Create `app/corretoras/[corretoraId]/apolices/[apoliceId]/ApoliceDetail.tsx`:

```tsx
'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { cancelarApolice } from "@/app/lib/actions-seguros";
import { COR_STATUS_APOLICE, LABEL_STATUS_APOLICE, type StatusApolice } from "@/app/lib/seguros/status";
import { LABEL_STATUS_SINISTRO } from "@/app/lib/seguros/sinistros";
import { formatData, hojeSaoPaulo } from "@/app/lib/seguros/datas";
import { LABEL_FORMA_PAGAMENTO, type ApoliceForm, type Cobertura, type ContatoResumo, type Endosso, type Parcela, type SinistroLinha } from "@/app/lib/seguros/types";
import { formatBRL } from "../../funis/constants";
import ParcelasTab from "../_components/ParcelasTab";
import EndossosTab from "../_components/EndossosTab";
import AnexosApoliceTab from "../_components/AnexosApoliceTab";

function Campo({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
    return (
        <Box sx={{ minWidth: 180 }}>
            <Typography variant="caption" color="text.secondary">{rotulo}</Typography>
            <Typography>{valor}</Typography>
        </Box>
    );
}

function resumoBem(form: ApoliceForm): string {
    const b = form.bem;
    if (b.tipo === "livre") return b.descricao || "—";
    if (b.tipo === "auto") return b.itens.map((i) => [i.marca, i.modelo, i.ano_modelo, i.placa].filter(Boolean).join(" ")).join("; ") || "—";
    if (b.tipo === "residencial") return b.itens.map((i) => [i.logradouro, i.numero, i.cidade, i.uf].filter(Boolean).join(", ")).join("; ") || "—";
    if (b.tipo === "rc") return b.itens.map((i) => i.atividade).join("; ") || "—";
    return b.itens.map((v) => `${v.nome} (${v.beneficiarios.length} beneficiário(s))`).join("; ") || "—";
}

export default function ApoliceDetail(props: {
    corretoraId: string;
    apoliceId: string;
    form: ApoliceForm;
    contato: ContatoResumo;
    seguradora: { nome: string; telefone_assistencia: string | null; telefone_sinistro: string | null };
    canceladaEm: string | null;
    status: StatusApolice;
    anterior: { id: string; numero: string } | null;
    renovacao: { id: string; numero: string } | null;
    parcelas: Parcela[];
    endossos: Endosso[];
    coberturasEndosso: Cobertura[];
    sinistros: SinistroLinha[];
    abaInicial: string;
}) {
    const { corretoraId, apoliceId, form } = props;
    const router = useRouter();
    const [aba, setAba] = useState(props.abaInicial);
    const [erro, setErro] = useState<string | null>(null);
    const base = `/corretoras/${corretoraId}`;
    const mostrarBoleto = form.formaPagamento === "boleto";

    async function alternarCancelamento() {
        setErro(null);
        const r = await cancelarApolice({ apoliceId, data: props.canceladaEm ? null : hojeSaoPaulo() });
        if (r.error) setErro(r.error); else router.refresh();
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1100 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(`${base}/apolices`)} sx={{ mb: 1 }}>Apólices</Button>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{props.seguradora.nome} · {form.numero}</Typography>
                    <Chip label={LABEL_STATUS_APOLICE[props.status]} color={COR_STATUS_APOLICE[props.status]} />
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button color={props.canceladaEm ? "primary" : "error"} onClick={alternarCancelamento}>
                        {props.canceladaEm ? "Reativar" : "Cancelar apólice"}
                    </Button>
                    <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => router.push(`${base}/apolices/${apoliceId}/editar`)}>Editar</Button>
                </Stack>
            </Stack>
            {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

            <Tabs value={aba} onChange={(_e, v) => setAba(v)} sx={{ mb: 2 }}>
                <Tab value="resumo" label="Resumo" />
                <Tab value="parcelas" label={`Parcelas (${props.parcelas.length})`} />
                <Tab value="endossos" label={`Endossos (${props.endossos.length})`} />
                <Tab value="sinistros" label={`Sinistros (${props.sinistros.length})`} />
                <Tab value="anexos" label="Anexos" />
            </Tabs>

            <Paper variant="outlined" sx={{ p: 2.5 }}>
                {aba === "resumo" && (
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap", rowGap: 2 }}>
                            <Campo rotulo="Cliente" valor={props.contato.nome} />
                            <Campo rotulo="Ramo" valor={form.ramo} />
                            <Campo rotulo="Vigência" valor={`${formatData(form.inicioVigencia)} – ${formatData(form.fimVigencia)}`} />
                            <Campo rotulo="Prêmio" valor={form.premio != null ? formatBRL(form.premio) : "—"} />
                            <Campo rotulo="Comissão" valor={form.percentualComissao != null ? `${String(form.percentualComissao).replace(".", ",")}%` : "—"} />
                            <Campo rotulo="Pagamento" valor={LABEL_FORMA_PAGAMENTO[form.formaPagamento]} />
                            <Campo rotulo="Assistência 24h" valor={props.seguradora.telefone_assistencia ?? "—"} />
                            <Campo rotulo="Telefone de sinistro" valor={props.seguradora.telefone_sinistro ?? "—"} />
                        </Stack>
                        <Campo rotulo="Bem segurado" valor={resumoBem(form)} />
                        <Box>
                            <Typography variant="caption" color="text.secondary">Coberturas</Typography>
                            {!form.coberturas.length && <Typography>—</Typography>}
                            {form.coberturas.map((c, i) => (
                                <Typography key={i}>
                                    • {c.nome}{c.importancia_segurada != null ? ` — IS ${formatBRL(c.importancia_segurada)}` : ""}{c.franquia != null ? ` — franquia ${formatBRL(c.franquia)}` : ""}
                                </Typography>
                            ))}
                        </Box>
                        <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
                            {form.negocioOrigemId && <Link component={NextLink} href={`${base}/funis?negocio=${form.negocioOrigemId}`}>Ver negócio de origem</Link>}
                            {props.anterior && <Link component={NextLink} href={`${base}/apolices/${props.anterior.id}`}>Apólice anterior ({props.anterior.numero})</Link>}
                            {props.renovacao && <Link component={NextLink} href={`${base}/apolices/${props.renovacao.id}`}>Renovada pela apólice {props.renovacao.numero}</Link>}
                        </Stack>
                    </Stack>
                )}
                {aba === "parcelas" && <ParcelasTab parcelas={props.parcelas} endossos={props.endossos} mostrarBoleto={mostrarBoleto} />}
                {aba === "endossos" && (
                    <EndossosTab apoliceId={apoliceId} endossos={props.endossos} coberturasEndosso={props.coberturasEndosso} percentualComissao={form.percentualComissao} mostrarBoleto={mostrarBoleto} />
                )}
                {aba === "sinistros" && (
                    <Stack spacing={1.5}>
                        <Button variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => router.push(`${base}/sinistros/novo?apoliceId=${apoliceId}`)}>Abrir sinistro</Button>
                        {!props.sinistros.length && <Typography color="text.secondary">Nenhum sinistro nesta apólice.</Typography>}
                        {props.sinistros.map((s) => (
                            <Link key={s.id} component={NextLink} href={`${base}/sinistros/${s.id}`}>
                                {formatData(s.data_ocorrencia)} · {s.tipo} · {LABEL_STATUS_SINISTRO[s.status]}
                            </Link>
                        ))}
                    </Stack>
                )}
                {aba === "anexos" && <AnexosApoliceTab apoliceId={apoliceId} />}
            </Paper>
        </Box>
    );
}
```

- [ ] **Step 6: Verificar o link do negócio de origem**

Run: `grep -n "searchParams\|negocio=" "app/corretoras/[corretoraId]/funis/FunisPage.tsx" | head`
Expected: descobrir qual parâmetro de URL o FunisPage usa para abrir o detalhe do negócio (o spec diz "detalhe do negócio é state de página via URL params"). Se o nome for diferente de `negocio`, trocar `?negocio=` no `ApoliceDetail` pelo nome real.

- [ ] **Step 7: Build e navegador**

Run: `npx -y pnpm@10 build && npx -y pnpm@10 lint` → sem erros.
No preview, abrir a apólice `TESTE-001` criada na Task 8: conferir Resumo (cliente, vigência, prêmio, bem "Honda Civic ... ABC1D23", cobertura Casco com franquia), aba Parcelas com 3 parcelas (31/01, 28/02, 31/03), dar baixa manual na 1ª (vira "Paga (manual)") e desfazer; criar endosso nº 1 com 1 parcela; enviar um PDF na aba Anexos e abrir o link. Console sem erros.

- [ ] **Step 8: Commit**

```bash
git add "app/corretoras/[corretoraId]/apolices"
git commit -m "feat(seguros): detalhe da apólice com parcelas, endossos, sinistros e anexos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Server Actions de sinistros e configurações

**Files:**
- Modify: `app/lib/actions-seguros.ts` (acrescentar ao final)

**Interfaces:**
- Consumes: `statusValidoParaRamo` (Task 2), `mensagemErroSeguros`, `nomeUsuario` (interno do arquivo).
- Produces:
  - `criarSinistro({ apoliceId, bemAutoId, bemResidencialId, dataOcorrencia, tipo, descricao, numeroSeguradora }): Promise<{ error: string | null; sinistroId: string | null }>`
  - `atualizarSinistro({ sinistroId, descricao, numeroSeguradora, valorIndenizacao }): Promise<{ error: string | null }>`
  - `registrarAndamento({ sinistroId, descricao, statusNovo, numeroProcesso }): Promise<{ error: string | null; andamentoId: string | null }>`
  - `atualizarConfiguracoesCorretora({ corretoraId, diasAntecedencia, etapaRenovacaoId }): Promise<{ error: string | null }>`

- [ ] **Step 1: Acrescentar imports e actions**

No topo de `app/lib/actions-seguros.ts`, acrescentar:

```ts
import { statusValidoParaRamo } from "@/app/lib/seguros/sinistros";
```

No final do arquivo:

```ts
export async function criarSinistro({
    apoliceId,
    bemAutoId,
    bemResidencialId,
    dataOcorrencia,
    tipo,
    descricao,
    numeroSeguradora,
}: {
    apoliceId: string;
    bemAutoId: string | null;
    bemResidencialId: string | null;
    dataOcorrencia: string;
    tipo: string;
    descricao: string | null;
    numeroSeguradora: string | null;
}) {
    if (!dataOcorrencia) return { error: "Informe a data da ocorrência", sinistroId: null };
    if (!tipo) return { error: "Informe o tipo do sinistro", sinistroId: null };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Usuario não encontrado", sinistroId: null };

    const { data: sinistro, error } = await supabase
        .from("sinistros")
        .insert({
            apolice_id: apoliceId,
            bem_auto_id: bemAutoId,
            bem_residencial_id: bemResidencialId,
            data_ocorrencia: dataOcorrencia,
            tipo,
            descricao,
            numero_seguradora: numeroSeguradora,
            status: "aberto",
        })
        .select("id")
        .single();
    if (error || !sinistro) return { error: error ? mensagemErroSeguros(error) : "Não foi possível abrir o sinistro", sinistroId: null };

    const { error: erroAndamento } = await supabase.from("sinistro_andamentos").insert({
        sinistro_id: sinistro.id,
        descricao: "Sinistro aberto",
        status_novo: "aberto",
        usuario_id: user.id,
        usuario_nome: nomeUsuario(user),
    });
    if (erroAndamento) {
        await supabase.from("sinistros").delete().eq("id", sinistro.id);
        return { error: mensagemErroSeguros(erroAndamento), sinistroId: null };
    }
    return { error: null, sinistroId: sinistro.id as string };
}

export async function atualizarSinistro({
    sinistroId,
    descricao,
    numeroSeguradora,
    valorIndenizacao,
}: {
    sinistroId: string;
    descricao: string | null;
    numeroSeguradora: string | null;
    valorIndenizacao: number | null;
}) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("sinistros")
        .update({ descricao, numero_seguradora: numeroSeguradora, valor_indenizacao: valorIndenizacao })
        .eq("id", sinistroId);
    return { error: error ? mensagemErroSeguros(error) : null };
}

export async function registrarAndamento({
    sinistroId,
    descricao,
    statusNovo,
    numeroProcesso,
}: {
    sinistroId: string;
    descricao: string;
    statusNovo: string | null;
    numeroProcesso: string | null;
}) {
    if (!descricao.trim()) return { error: "Descreva o andamento", andamentoId: null };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Usuario não encontrado", andamentoId: null };

    const { data: sinistro } = await supabase
        .from("sinistros")
        .select("status, apolice:apolices(ramo)")
        .eq("id", sinistroId)
        .maybeSingle();
    if (!sinistro) return { error: "Sinistro não encontrado", andamentoId: null };

    const ramo = (sinistro.apolice as unknown as { ramo: string }).ramo;
    const mudouStatus = statusNovo && statusNovo !== sinistro.status;
    if (mudouStatus && !statusValidoParaRamo(statusNovo, ramo)) {
        return { error: "Esse status não se aplica a sinistros desse ramo", andamentoId: null };
    }

    const { data: andamento, error } = await supabase
        .from("sinistro_andamentos")
        .insert({
            sinistro_id: sinistroId,
            descricao: descricao.trim(),
            status_novo: mudouStatus ? statusNovo : null,
            numero_processo: numeroProcesso || null,
            usuario_id: user.id,
            usuario_nome: nomeUsuario(user),
        })
        .select("id")
        .single();
    if (error || !andamento) return { error: error ? mensagemErroSeguros(error) : "Não foi possível registrar o andamento", andamentoId: null };

    if (mudouStatus) {
        const { error: erroStatus } = await supabase.from("sinistros").update({ status: statusNovo }).eq("id", sinistroId);
        if (erroStatus) {
            await supabase.from("sinistro_andamentos").delete().eq("id", andamento.id);
            return { error: mensagemErroSeguros(erroStatus), andamentoId: null };
        }
    }
    return { error: null, andamentoId: andamento.id as string };
}

export async function atualizarConfiguracoesCorretora({
    corretoraId,
    diasAntecedencia,
    etapaRenovacaoId,
}: {
    corretoraId: string;
    diasAntecedencia: number;
    etapaRenovacaoId: string | null;
}) {
    if (!Number.isInteger(diasAntecedencia) || diasAntecedencia < 1 || diasAntecedencia > 365) {
        return { error: "Informe entre 1 e 365 dias" };
    }
    const supabase = await createClient();
    const { error } = await supabase.from("corretoras").update({ dias_antecedencia_renovacao: diasAntecedencia }).eq("id", corretoraId);
    if (error) return { error: mensagemErroSeguros(error) };

    const { data: fluxos } = await supabase.from("fluxos").select("id").eq("corretora_id", corretoraId);
    const fluxoIds = (fluxos ?? []).map((f) => f.id as string);
    if (fluxoIds.length) {
        const { error: erroLimpar } = await supabase.from("etapas").update({ renovacao: false }).in("fluxo_id", fluxoIds).eq("renovacao", true);
        if (erroLimpar) return { error: mensagemErroSeguros(erroLimpar) };
    }
    if (etapaRenovacaoId) {
        const { error: erroMarcar } = await supabase.from("etapas").update({ renovacao: true }).eq("id", etapaRenovacaoId).in("fluxo_id", fluxoIds);
        if (erroMarcar) return { error: mensagemErroSeguros(erroMarcar) };
    }
    return { error: null };
}
```

- [ ] **Step 2: Build/lint**

Run: `npx -y pnpm@10 build && npx -y pnpm@10 lint` → sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/lib/actions-seguros.ts
git commit -m "feat(seguros): actions de sinistros, andamentos e configurações da corretora

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Telas de sinistros (lista, abertura, detalhe com andamentos)

**Files:**
- Create: `app/corretoras/[corretoraId]/sinistros/page.tsx`, `SinistrosPage.tsx`, `novo/page.tsx`, `novo/NovoSinistroForm.tsx`, `[sinistroId]/page.tsx`, `[sinistroId]/SinistroDetail.tsx`

**Interfaces:**
- Consumes: `criarSinistro`, `atualizarSinistro`, `registrarAndamento` (Task 10); `statusDoRamo`, `LABEL_STATUS_SINISTRO`, `tiposSinistroDoRamo`, `tipoBemDoRamo`, `formatData`, `parseValorBR`, `hojeSaoPaulo`, `SinistroLinha`, `Andamento`; `AnexosApoliceTab` (Task 9).
- Produces: rotas `/corretoras/[id]/sinistros`, `/sinistros/novo?apoliceId=`, `/sinistros/[sinistroId]`.

- [ ] **Step 1: Lista (server + client)**

Create `app/corretoras/[corretoraId]/sinistros/page.tsx`:

```tsx
import { createClient } from "@/utils/supabase/server";
import type { SinistroLinha } from "@/app/lib/seguros/types";
import SinistrosPage from "./SinistrosPage";

export default async function Page({ params }: { params: Promise<{ corretoraId: string }> }) {
    const { corretoraId } = await params;
    const supabase = await createClient();

    const { data } = await supabase
        .from("sinistros")
        .select("id, data_ocorrencia, tipo, status, numero_seguradora, apolice:apolices!inner(id, numero, ramo, corretora_id, contato:contatos(nome))")
        .eq("apolice.corretora_id", corretoraId)
        .order("data_ocorrencia", { ascending: false });

    type Linha = { id: string; data_ocorrencia: string; tipo: string; status: SinistroLinha["status"]; numero_seguradora: string | null; apolice: { id: string; numero: string; ramo: string; contato: { nome: string } | null } };
    const sinistros: SinistroLinha[] = ((data ?? []) as unknown as Linha[]).map((s) => ({
        id: s.id,
        apolice_id: s.apolice.id,
        apolice_numero: s.apolice.numero,
        ramo: s.apolice.ramo,
        contato_nome: s.apolice.contato?.nome ?? "—",
        data_ocorrencia: s.data_ocorrencia,
        tipo: s.tipo,
        status: s.status,
        numero_seguradora: s.numero_seguradora,
    }));

    return <SinistrosPage corretoraId={corretoraId} sinistros={sinistros} />;
}
```

Create `app/corretoras/[corretoraId]/sinistros/SinistrosPage.tsx`:

```tsx
'use client';
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { LABEL_STATUS_SINISTRO, type StatusSinistro } from "@/app/lib/seguros/sinistros";
import { formatData } from "@/app/lib/seguros/datas";
import type { SinistroLinha } from "@/app/lib/seguros/types";

export default function SinistrosPage({ corretoraId, sinistros }: { corretoraId: string; sinistros: SinistroLinha[] }) {
    const router = useRouter();
    const [status, setStatus] = useState<StatusSinistro | "">("");
    const [ramo, setRamo] = useState("");
    const ramos = useMemo(() => [...new Set(sinistros.map((s) => s.ramo))].sort(), [sinistros]);
    const filtrados = sinistros.filter((s) => (!status || s.status === status) && (!ramo || s.ramo === ramo));

    const colunas: GridColDef<SinistroLinha>[] = [
        { field: "data_ocorrencia", headerName: "Ocorrência", flex: 0.8, valueFormatter: (v: string) => formatData(v) },
        { field: "contato_nome", headerName: "Cliente", flex: 1.3 },
        { field: "apolice_numero", headerName: "Apólice", flex: 0.9 },
        { field: "ramo", headerName: "Ramo", flex: 1 },
        { field: "tipo", headerName: "Tipo", flex: 1 },
        { field: "numero_seguradora", headerName: "Nº seguradora", flex: 0.9, valueFormatter: (v: string | null) => v ?? "—" },
        { field: "status", headerName: "Status", flex: 1, renderCell: ({ row }) => <Chip size="small" label={LABEL_STATUS_SINISTRO[row.status]} /> },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Sinistros</Typography>
                <Button variant="contained" onClick={() => router.push(`/corretoras/${corretoraId}/sinistros/novo`)}>Abrir sinistro</Button>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
                <TextField size="small" select label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusSinistro | "")} sx={{ minWidth: 220 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {(Object.keys(LABEL_STATUS_SINISTRO) as StatusSinistro[]).map((s) => <MenuItem key={s} value={s}>{LABEL_STATUS_SINISTRO[s]}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Ramo" value={ramo} onChange={(e) => setRamo(e.target.value)} sx={{ minWidth: 220 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {ramos.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
            </Stack>
            <Paper variant="outlined">
                <DataGrid
                    rows={filtrados}
                    columns={colunas}
                    autoHeight
                    disableRowSelectionOnClick
                    onRowClick={({ row }) => router.push(`/corretoras/${corretoraId}/sinistros/${row.id}`)}
                    localeText={{ noRowsLabel: "Nenhum sinistro encontrado" }}
                    sx={{ border: 0, "& .MuiDataGrid-row": { cursor: "pointer" } }}
                />
            </Paper>
        </Box>
    );
}
```

- [ ] **Step 2: Abertura de sinistro**

Create `app/corretoras/[corretoraId]/sinistros/novo/page.tsx`:

```tsx
import { createClient } from "@/utils/supabase/server";
import NovoSinistroForm, { type ApoliceOpcao } from "./NovoSinistroForm";

export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ corretoraId: string }>;
    searchParams: Promise<{ apoliceId?: string }>;
}) {
    const { corretoraId } = await params;
    const { apoliceId } = await searchParams;
    const supabase = await createClient();

    const { data } = await supabase
        .from("apolices")
        .select("id, numero, ramo, contato:contatos(nome), bens_auto(id, placa, modelo), bens_residencial(id, logradouro, numero)")
        .eq("corretora_id", corretoraId)
        .is("cancelada_em", null)
        .order("fim_vigencia", { ascending: false });

    return <NovoSinistroForm corretoraId={corretoraId} apolices={(data ?? []) as unknown as ApoliceOpcao[]} apoliceInicialId={apoliceId ?? null} />;
}
```

Create `app/corretoras/[corretoraId]/sinistros/novo/NovoSinistroForm.tsx`:

```tsx
'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import { criarSinistro } from "@/app/lib/actions-seguros";
import { tiposSinistroDoRamo } from "@/app/lib/seguros/sinistros";
import { hojeSaoPaulo } from "@/app/lib/seguros/datas";

export type ApoliceOpcao = {
    id: string;
    numero: string;
    ramo: string;
    contato: { nome: string } | null;
    bens_auto: { id: string; placa: string | null; modelo: string | null }[];
    bens_residencial: { id: string; logradouro: string | null; numero: string | null }[];
};

export default function NovoSinistroForm({ corretoraId, apolices, apoliceInicialId }: { corretoraId: string; apolices: ApoliceOpcao[]; apoliceInicialId: string | null }) {
    const router = useRouter();
    const [apolice, setApolice] = useState<ApoliceOpcao | null>(apolices.find((a) => a.id === apoliceInicialId) ?? null);
    const [bemId, setBemId] = useState("");
    const [data, setData] = useState(hojeSaoPaulo());
    const [tipo, setTipo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [numeroSeguradora, setNumeroSeguradora] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);

    const bens = apolice
        ? [
            ...apolice.bens_auto.map((b) => ({ id: b.id, rotulo: [b.modelo, b.placa].filter(Boolean).join(" · ") || "Veículo", tabela: "auto" as const })),
            ...apolice.bens_residencial.map((b) => ({ id: b.id, rotulo: [b.logradouro, b.numero].filter(Boolean).join(", ") || "Imóvel", tabela: "residencial" as const })),
        ]
        : [];

    async function salvar() {
        if (!apolice) { setErro("Escolha a apólice"); return; }
        setErro(null);
        setSalvando(true);
        const bem = bens.find((b) => b.id === bemId);
        const r = await criarSinistro({
            apoliceId: apolice.id,
            bemAutoId: bem?.tabela === "auto" ? bem.id : null,
            bemResidencialId: bem?.tabela === "residencial" ? bem.id : null,
            dataOcorrencia: data,
            tipo,
            descricao: descricao || null,
            numeroSeguradora: numeroSeguradora || null,
        });
        setSalvando(false);
        if (r.error || !r.sinistroId) { setErro(r.error ?? "Erro ao salvar"); return; }
        router.push(`/corretoras/${corretoraId}/sinistros/${r.sinistroId}`);
    }

    return (
        <Box sx={{ p: 3, maxWidth: 800 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Abrir sinistro</Typography>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                    <Autocomplete
                        options={apolices}
                        value={apolice}
                        getOptionLabel={(a) => `${a.numero} · ${a.contato?.nome ?? ""} · ${a.ramo}`}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        onChange={(_e, a) => {
                            setApolice(a);
                            setTipo("");
                            setBemId(a && a.bens_auto.length + a.bens_residencial.length === 1 ? (a.bens_auto[0]?.id ?? a.bens_residencial[0].id) : "");
                        }}
                        renderInput={(p) => <TextField {...p} label="Apólice" required />}
                    />
                    {bens.length > 1 && (
                        <TextField select label="Bem envolvido" value={bemId} onChange={(e) => setBemId(e.target.value)}>
                            {bens.map((b) => <MenuItem key={b.id} value={b.id}>{b.rotulo}</MenuItem>)}
                        </TextField>
                    )}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <TextField label="Data da ocorrência" type="date" required value={data} onChange={(e) => setData(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                        <TextField select label="Tipo" required value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={!apolice} sx={{ flex: 1 }}>
                            {(apolice ? tiposSinistroDoRamo(apolice.ramo) : []).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </TextField>
                        <TextField label="Nº do sinistro na seguradora" value={numeroSeguradora} onChange={(e) => setNumeroSeguradora(e.target.value)} sx={{ flex: 1 }} />
                    </Stack>
                    <TextField label="Descrição" multiline minRows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                    {erro && <Alert severity="error">{erro}</Alert>}
                    <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end" }}>
                        <Button onClick={() => router.back()}>Cancelar</Button>
                        <Button variant="contained" disabled={salvando} onClick={salvar}>{salvando ? "Salvando..." : "Abrir sinistro"}</Button>
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
}
```

- [ ] **Step 3: Detalhe do sinistro**

Create `app/corretoras/[corretoraId]/sinistros/[sinistroId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Andamento } from "@/app/lib/seguros/types";
import type { StatusSinistro } from "@/app/lib/seguros/sinistros";
import SinistroDetail from "./SinistroDetail";

export default async function Page({ params }: { params: Promise<{ corretoraId: string; sinistroId: string }> }) {
    const { corretoraId, sinistroId } = await params;
    const supabase = await createClient();

    const { data: s } = await supabase
        .from("sinistros")
        .select("id, data_ocorrencia, tipo, descricao, numero_seguradora, status, valor_indenizacao, apolice:apolices(id, numero, ramo, corretora_id, contato:contatos(nome), seguradora:seguradoras(nome, telefone_sinistro))")
        .eq("id", sinistroId)
        .maybeSingle();

    type Apolice = { id: string; numero: string; ramo: string; corretora_id: string; contato: { nome: string } | null; seguradora: { nome: string; telefone_sinistro: string | null } | null };
    const apolice = s?.apolice as unknown as Apolice | undefined;
    if (!s || !apolice || apolice.corretora_id !== corretoraId) notFound();

    const { data: andamentos } = await supabase
        .from("sinistro_andamentos")
        .select("id, data, descricao, status_novo, numero_processo, usuario_nome")
        .eq("sinistro_id", sinistroId)
        .order("data", { ascending: false });

    return (
        <SinistroDetail
            corretoraId={corretoraId}
            sinistro={{
                id: s.id as string,
                data_ocorrencia: s.data_ocorrencia as string,
                tipo: s.tipo as string,
                descricao: s.descricao as string | null,
                numero_seguradora: s.numero_seguradora as string | null,
                status: s.status as StatusSinistro,
                valor_indenizacao: s.valor_indenizacao as number | null,
            }}
            apolice={apolice}
            andamentos={(andamentos ?? []) as Andamento[]}
        />
    );
}
```

Create `app/corretoras/[corretoraId]/sinistros/[sinistroId]/SinistroDetail.tsx`:

```tsx
'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { atualizarSinistro, registrarAndamento } from "@/app/lib/actions-seguros";
import { LABEL_STATUS_SINISTRO, statusDoRamo, type StatusSinistro } from "@/app/lib/seguros/sinistros";
import { tipoBemDoRamo } from "@/app/lib/seguros/ramos";
import { formatData, parseValorBR } from "@/app/lib/seguros/datas";
import type { Andamento } from "@/app/lib/seguros/types";
import AnexosApoliceTab from "../../apolices/_components/AnexosApoliceTab";

type Sinistro = {
    id: string; data_ocorrencia: string; tipo: string; descricao: string | null;
    numero_seguradora: string | null; status: StatusSinistro; valor_indenizacao: number | null;
};
type Apolice = { id: string; numero: string; ramo: string; contato: { nome: string } | null; seguradora: { nome: string; telefone_sinistro: string | null } | null };

const num = (n: number | null) => (n != null ? String(n).replace(".", ",") : "");

export default function SinistroDetail({ corretoraId, sinistro, apolice, andamentos }: { corretoraId: string; sinistro: Sinistro; apolice: Apolice; andamentos: Andamento[] }) {
    const router = useRouter();
    const etapas = statusDoRamo(apolice.ramo);
    const ativo = etapas.indexOf(sinistro.status);
    const ehRc = tipoBemDoRamo(apolice.ramo) === "rc";

    const [descricaoAnd, setDescricaoAnd] = useState("");
    const [statusNovo, setStatusNovo] = useState<string>("");
    const [processo, setProcesso] = useState("");
    const [numeroSeg, setNumeroSeg] = useState(sinistro.numero_seguradora ?? "");
    const [valorInd, setValorInd] = useState(num(sinistro.valor_indenizacao));
    const [descricao, setDescricao] = useState(sinistro.descricao ?? "");
    const [erro, setErro] = useState<string | null>(null);
    const [versaoAnexos, setVersaoAnexos] = useState(0);
    const [ultimoAndamentoId, setUltimoAndamentoId] = useState<string | null>(null);

    async function salvarAndamento() {
        setErro(null);
        const r = await registrarAndamento({ sinistroId: sinistro.id, descricao: descricaoAnd, statusNovo: statusNovo || null, numeroProcesso: processo || null });
        if (r.error) { setErro(r.error); return; }
        setDescricaoAnd(""); setStatusNovo(""); setProcesso("");
        setUltimoAndamentoId(r.andamentoId);
        router.refresh();
    }

    async function salvarDados() {
        setErro(null);
        const r = await atualizarSinistro({ sinistroId: sinistro.id, descricao: descricao || null, numeroSeguradora: numeroSeg || null, valorIndenizacao: parseValorBR(valorInd) });
        if (r.error) setErro(r.error); else router.refresh();
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1100 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(`/corretoras/${corretoraId}/sinistros`)} sx={{ mb: 1 }}>Sinistros</Button>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{sinistro.tipo} · {formatData(sinistro.data_ocorrencia)}</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
                {apolice.contato?.nome} · <Link component={NextLink} href={`/corretoras/${corretoraId}/apolices/${apolice.id}`}>Apólice {apolice.numero}</Link> · {apolice.seguradora?.nome}
                {apolice.seguradora?.telefone_sinistro ? ` · Sinistro: ${apolice.seguradora.telefone_sinistro}` : ""}
            </Typography>

            <Paper variant="outlined" sx={{ p: 2.5, mb: 2, overflowX: "auto" }}>
                <Stepper activeStep={ativo} alternativeLabel>
                    {etapas.map((s) => <Step key={s}><StepLabel>{LABEL_STATUS_SINISTRO[s]}</StepLabel></Step>)}
                </Stepper>
            </Paper>

            {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "flex-start" }}>
                <Paper variant="outlined" sx={{ p: 2.5, flex: 1.4, width: "100%" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Registrar andamento</Typography>
                    <Stack spacing={1.5}>
                        <TextField label="O que aconteceu" multiline minRows={2} value={descricaoAnd} onChange={(e) => setDescricaoAnd(e.target.value)} />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField select label="Mudar status para" value={statusNovo} onChange={(e) => setStatusNovo(e.target.value)} sx={{ flex: 1 }}>
                                <MenuItem value="">Manter ({LABEL_STATUS_SINISTRO[sinistro.status]})</MenuItem>
                                {etapas.filter((s) => s !== sinistro.status).map((s) => <MenuItem key={s} value={s}>{LABEL_STATUS_SINISTRO[s]}</MenuItem>)}
                            </TextField>
                            {ehRc && <TextField label="Nº do processo" value={processo} onChange={(e) => setProcesso(e.target.value)} sx={{ flex: 1 }} />}
                        </Stack>
                        <Button variant="contained" sx={{ alignSelf: "flex-end" }} disabled={!descricaoAnd.trim()} onClick={salvarAndamento}>Registrar</Button>
                    </Stack>

                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Histórico</Typography>
                    <Stack spacing={1.5}>
                        {andamentos.map((a) => (
                            <Box key={a.id} sx={{ borderLeft: 3, borderColor: a.status_novo ? "primary.main" : "divider", pl: 1.5 }}>
                                <Typography variant="caption" color="text.secondary">{formatData(a.data)} · {a.usuario_nome}</Typography>
                                {a.status_novo && <Typography variant="body2" sx={{ fontWeight: 700 }}>→ {LABEL_STATUS_SINISTRO[a.status_novo]}</Typography>}
                                <Typography variant="body2">{a.descricao}</Typography>
                                {a.numero_processo && <Typography variant="caption">Processo {a.numero_processo}</Typography>}
                            </Box>
                        ))}
                    </Stack>
                </Paper>

                <Stack spacing={2} sx={{ flex: 1, width: "100%" }}>
                    <Paper variant="outlined" sx={{ p: 2.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Dados do sinistro</Typography>
                        <Stack spacing={1.5}>
                            <TextField label="Nº na seguradora" value={numeroSeg} onChange={(e) => setNumeroSeg(e.target.value)} />
                            <TextField label="Valor da indenização (R$)" value={valorInd} onChange={(e) => setValorInd(e.target.value)} />
                            <TextField label="Descrição" multiline minRows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                            <Button variant="outlined" sx={{ alignSelf: "flex-end" }} onClick={salvarDados}>Salvar dados</Button>
                        </Stack>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Documentos</Typography>
                        <AnexosApoliceTab apoliceId={apolice.id} sinistroId={sinistro.id} andamentoId={ultimoAndamentoId} versao={versaoAnexos} />
                        <Button size="small" sx={{ mt: 1 }} onClick={() => setVersaoAnexos((v) => v + 1)}>Atualizar lista</Button>
                    </Paper>
                </Stack>
            </Stack>
        </Box>
    );
}
```

- [ ] **Step 4: Build e navegador**

Run: `npx -y pnpm@10 build && npx -y pnpm@10 lint` → sem erros.
No preview: abrir sinistro "Colisão" pela aba Sinistros da apólice `TESTE-001`; no detalhe, o stepper mostra os 9 passos de auto com "Aberto" ativo; registrar andamento mudando para "Vistoria" → stepper avança e o histórico mostra "→ Vistoria"; enviar um arquivo em Documentos; lista `/sinistros` mostra o sinistro com status "Vistoria". Console sem erros.

- [ ] **Step 5: Commit**

```bash
git add "app/corretoras/[corretoraId]/sinistros"
git commit -m "feat(seguros): telas de sinistros com status por ramo e histórico de andamentos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Integração com o funil (Emitir / Ver apólice, negócio de renovação)

**Files:**
- Modify: `app/corretoras/[corretoraId]/funis/types.ts` (tipo `Negocio`), `app/corretoras/[corretoraId]/funis/page.tsx` (select), `app/corretoras/[corretoraId]/funis/DealDetail.tsx` (botões)

**Interfaces:**
- Consumes: rota `/apolices/nova?negocioId=` (Task 8), FKs nomeadas `apolices_negocio_origem_id_fkey`, `negocios_apolice_renovada_id_fkey` (Task 3).
- Produces: `Negocio.apolice_renovada_id: string | null`, `Negocio.apolice_emitida_id: string | null`.

- [ ] **Step 1: Tipo**

Em `app/corretoras/[corretoraId]/funis/types.ts`, dentro de `export type Negocio = { ... }`, após `fechado_em: string | null;` acrescentar:

```ts
    apolice_renovada_id: string | null;
    apolice_emitida_id: string | null;
```

- [ ] **Step 2: Query do funil**

Em `app/corretoras/[corretoraId]/funis/page.tsx`, trocar o `.select(...)` de `negocios` por:

```ts
                .select("id, etapa_id, tipo, ramo, seguradora, origem, grupo_producao, valor, indicacao, criado_em, fechado_em, apolice_renovada_id, contato:contatos(id, nome, telefone, email, cpf_cnpj, tipo_pessoa, profissoes), vendedor:usuarios(id, nome), apolice_emitida:apolices!apolices_negocio_origem_id_fkey(id)")
```

e trocar `negocios = (negociosData ?? []) as unknown as Negocio[];` por:

```ts
            type Bruto = Omit<Negocio, "apolice_emitida_id"> & { apolice_emitida: { id: string } | { id: string }[] | null };
            negocios = ((negociosData ?? []) as unknown as Bruto[]).map(({ apolice_emitida, ...n }) => ({
                ...n,
                apolice_emitida_id: Array.isArray(apolice_emitida) ? (apolice_emitida[0]?.id ?? null) : (apolice_emitida?.id ?? null),
            }));
```

- [ ] **Step 3: Botões no DealDetail**

Em `app/corretoras/[corretoraId]/funis/DealDetail.tsx`:

Acrescentar imports:

```ts
import { useParams, useRouter } from "next/navigation";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
```

No início do componente (logo após a desestruturação das props):

```ts
    const router = useRouter();
    const { corretoraId } = useParams<{ corretoraId: string }>();
```

Localizar a linha do botão de exclusão (`DeleteOutlineIcon`) no cabeçalho do detalhe e, imediatamente antes dele, inserir:

```tsx
                {negocio.apolice_emitida_id ? (
                    <Button
                        variant="outlined"
                        startIcon={<DescriptionOutlinedIcon />}
                        onClick={() => router.push(`/corretoras/${corretoraId}/apolices/${negocio.apolice_emitida_id}`)}
                    >
                        Ver apólice
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        startIcon={<DescriptionOutlinedIcon />}
                        onClick={() => router.push(`/corretoras/${corretoraId}/apolices/nova?negocioId=${negocio.id}`)}
                    >
                        Emitir apólice
                    </Button>
                )}
                {negocio.apolice_renovada_id && (
                    <Button onClick={() => router.push(`/corretoras/${corretoraId}/apolices/${negocio.apolice_renovada_id}`)}>
                        Apólice a renovar
                    </Button>
                )}
```

Antes de editar, rodar `grep -n "DeleteOutlineIcon" "app/corretoras/[corretoraId]/funis/DealDetail.tsx"` para achar a linha exata do botão no JSX (não o import).

- [ ] **Step 4: Build e navegador**

Run: `npx -y pnpm@10 build && npx -y pnpm@10 lint` → sem erros.
No preview: abrir um negócio no funil → botão "Emitir apólice" leva ao formulário com cliente, ramo, seguradora (se o nome bater com a lista) e prêmio preenchidos; salvar; voltar ao funil → o mesmo negócio mostra "Ver apólice" e `fechado_em` preenchido. Conferir no banco: `select negocio_origem_id from apolices where numero = '<número usado>'` = id do negócio.

- [ ] **Step 5: Commit**

```bash
git add "app/corretoras/[corretoraId]/funis"
git commit -m "feat(seguros): emitir apólice a partir do negócio e ligar renovação ao funil

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Configurações da corretora

**Files:**
- Create: `app/corretoras/[corretoraId]/configuracoes/page.tsx`, `ConfiguracoesPage.tsx`

**Interfaces:**
- Consumes: `atualizarConfiguracoesCorretora` (Task 10).
- Produces: rota `/corretoras/[id]/configuracoes`.

- [ ] **Step 1: Página server**

Create `app/corretoras/[corretoraId]/configuracoes/page.tsx`:

```tsx
import { createClient } from "@/utils/supabase/server";
import ConfiguracoesPage from "./ConfiguracoesPage";

export default async function Page({ params }: { params: Promise<{ corretoraId: string }> }) {
    const { corretoraId } = await params;
    const supabase = await createClient();

    const { data: corretora } = await supabase.from("corretoras").select("dias_antecedencia_renovacao").eq("id", corretoraId).single();
    const { data: fluxos } = await supabase.from("fluxos").select("id, ativo, criado_em").eq("corretora_id", corretoraId).order("criado_em");
    const fluxo = (fluxos ?? []).find((f) => f.ativo) ?? fluxos?.[0] ?? null;

    const { data: etapas } = fluxo
        ? await supabase.from("etapas").select("id, nome, ordem, renovacao").eq("fluxo_id", fluxo.id).order("ordem")
        : { data: [] as { id: string; nome: string; ordem: number; renovacao: boolean }[] };

    return (
        <ConfiguracoesPage
            corretoraId={corretoraId}
            diasIniciais={(corretora?.dias_antecedencia_renovacao as number | undefined) ?? 60}
            etapas={(etapas ?? []) as { id: string; nome: string; renovacao: boolean }[]}
        />
    );
}
```

- [ ] **Step 2: Página client**

Create `app/corretoras/[corretoraId]/configuracoes/ConfiguracoesPage.tsx`:

```tsx
'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import { atualizarConfiguracoesCorretora } from "@/app/lib/actions-seguros";

export default function ConfiguracoesPage({
    corretoraId,
    diasIniciais,
    etapas,
}: {
    corretoraId: string;
    diasIniciais: number;
    etapas: { id: string; nome: string; renovacao: boolean }[];
}) {
    const router = useRouter();
    const [dias, setDias] = useState(String(diasIniciais));
    const [etapaId, setEtapaId] = useState(etapas.find((e) => e.renovacao)?.id ?? "");
    const [erro, setErro] = useState<string | null>(null);
    const [salvo, setSalvo] = useState(false);

    async function salvar() {
        setErro(null);
        setSalvo(false);
        const r = await atualizarConfiguracoesCorretora({ corretoraId, diasAntecedencia: Number(dias), etapaRenovacaoId: etapaId || null });
        if (r.error) { setErro(r.error); return; }
        setSalvo(true);
        router.refresh();
    }

    return (
        <Box sx={{ p: 3, maxWidth: 720 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Configurações</Typography>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Renovações</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Todo dia, o imsure cria um negócio de renovação no funil para cada apólice que vence dentro do prazo abaixo.
                </Typography>
                <Stack spacing={2}>
                    <TextField label="Criar negócio quantos dias antes do vencimento" type="number" value={dias} onChange={(e) => setDias(e.target.value)} slotProps={{ htmlInput: { min: 1, max: 365 } }} />
                    <TextField select label="Etapa do funil onde o negócio entra" value={etapaId} onChange={(e) => setEtapaId(e.target.value)}>
                        <MenuItem value="">Nenhuma (usar a primeira etapa)</MenuItem>
                        {etapas.map((e) => <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>)}
                    </TextField>
                    {!etapaId && <Alert severity="warning">Nenhuma etapa marcada como de renovação — os negócios vão entrar na primeira etapa do funil.</Alert>}
                    {!etapas.length && <Alert severity="info">Esta corretora ainda não tem funil configurado; nenhum negócio de renovação será criado.</Alert>}
                    {erro && <Alert severity="error">{erro}</Alert>}
                    {salvo && <Alert severity="success">Configurações salvas.</Alert>}
                    <Button variant="contained" sx={{ alignSelf: "flex-end" }} onClick={salvar}>Salvar</Button>
                </Stack>
            </Paper>
        </Box>
    );
}
```

- [ ] **Step 3: Build e navegador**

Run: `npx -y pnpm@10 build && npx -y pnpm@10 lint` → sem erros.
No preview `/corretoras/<id>/configuracoes`: a etapa "Prospecção / Renovações" já vem selecionada (migração da Task 3); mudar dias para `45` e etapa para outra, salvar → "Configurações salvas."; conferir no banco `select dias_antecedencia_renovacao from corretoras where id = '<id>'` = 45 e só uma etapa com `renovacao = true`. Voltar a configuração original.

- [ ] **Step 4: Commit**

```bash
git add "app/corretoras/[corretoraId]/configuracoes"
git commit -m "feat(seguros): tela de configurações de renovação da corretora

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Documentação e verificação final

**Files:**
- Modify: `CLAUDE.md`, `docs/decisoes.md`, `docs/superpowers/specs/2026-10-02-base-seguros-design.md`

- [ ] **Step 1: Ajustar o spec às decisões tomadas no plano**

Em `docs/superpowers/specs/2026-10-02-base-seguros-design.md`:
- Seção `apolices`: trocar "Status é derivado, não armazenado (view `apolices_com_status` ou função)" por "Status é derivado em TypeScript (`calcularStatusApolice`), sem view no banco".
- Seção `etapas.renovacao`: trocar "marca a etapa chamada `Renovações`" por "marca a primeira etapa cujo nome contém 'renova' (sem acento/maiúscula) — o funil padrão do onboarding se chama 'Prospecção / Renovações'".
- Seção Renovação automática: `tipo = 'Renovação simples'` (valor existente em `TIPOS`) e `origem = 'Renovação'`.
- Seção `apolice_anexos`: caminho no bucket `apolice_id/arquivo` (mesmo padrão do `negocio-anexos`).
- Seção Server Actions: substituir a lista pela lista real de `app/lib/actions-seguros.ts`.

- [ ] **Step 2: CLAUDE.md**

Em `CLAUDE.md`:
- Tabela de páginas: acrescentar `/corretoras/[corretoraId]/apolices` (lista, `nova`, `[apoliceId]`, `[apoliceId]/editar`), `/sinistros` (lista, `novo`, `[sinistroId]`) e `/configuracoes`.
- Server Actions: acrescentar linha `app/lib/actions-seguros.ts` com as funções.
- Banco: acrescentar à hierarquia `corretoras → apolices → (endossos, parcelas, coberturas, bens_*, vidas_seguradas → beneficiarios, sinistros → sinistro_andamentos, apolice_anexos)`, `seguradoras` global; RLS via `usuario_possui_corretora`/`usuario_possui_apolice`; migrações versionadas em `supabase/migrations/` e testes SQL em `supabase/tests/`; renovação diária via `pg_cron`.
- Comandos: acrescentar `pnpm test` (Vitest, lógica pura em `app/lib/seguros/`).
- Pendências: remover "Não existe suíte de testes"; acrescentar "telefones/códigos SUSEP das seguradoras ainda nulos" e o roadmap (1b baixa de comissão, 2 portal + PWA, 3 ações do cliente, 4 comunicação) apontando para o spec.

- [ ] **Step 3: decisoes.md**

Acrescentar seção "## Base de seguros (etapa 1 do portal do cliente)" resumindo as decisões da tabela do spec (cada uma com o porquê, em 1–2 linhas) e linkando o spec.

- [ ] **Step 4: Verificação completa**

Run, em sequência:
- `npx -y pnpm@10 test` → PASS
- `npx -y pnpm@10 lint` → sem erros
- `npx -y pnpm@10 build` → sem erros
- `execute_sql` com `supabase/tests/rls_seguros.sql` → `RLS OK`
- `execute_sql` com `supabase/tests/renovacao.sql` → `RENOVACAO OK`
- `get_advisors` (`security` e `performance`) → registrar qualquer alerta novo no relatório
- Navegador: percorrer de ponta a ponta (lista → nova apólice auto → detalhe → endosso → sinistro com andamento → emitir apólice a partir de negócio → configurações), com screenshot final da lista de apólices.

Remover os dados de teste criados no navegador (apólice `TESTE-001` etc.) só se o Mitz pedir — por padrão, deixar para ele ver.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/decisoes.md docs/superpowers/specs/2026-10-02-base-seguros-design.md
git commit -m "docs: atualiza CLAUDE.md, decisões e spec com a base de seguros

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
