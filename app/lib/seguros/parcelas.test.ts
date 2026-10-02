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
