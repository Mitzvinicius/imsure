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
