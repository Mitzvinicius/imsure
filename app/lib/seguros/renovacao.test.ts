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
