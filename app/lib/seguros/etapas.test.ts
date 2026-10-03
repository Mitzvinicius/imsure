import { describe, expect, it } from "vitest";
import { indiceEtapaEmissao, LABEL_STATUS_NEGOCIO, MOTIVOS_PERDA } from "./etapas";

describe("indiceEtapaEmissao", () => {
    it("acha 'Seguro Emitido' e variações sem acento", () => {
        expect(indiceEtapaEmissao(["Prospecção", "Proposta Enviada", "Seguro Emitido"])).toBe(2);
        expect(indiceEtapaEmissao(["Novo", "EMISSÃO"])).toBe(1);
        expect(indiceEtapaEmissao(["Novo", "Apólice emitida", "Seguro emitido"])).toBe(1);
    });
    it("devolve -1 quando não há etapa de emissão", () => {
        expect(indiceEtapaEmissao(["Prospecção / Renovações", "Contato feito", "Em negociação", "Arquivado"])).toBe(-1);
    });
});

describe("status e motivos", () => {
    it("rótulos dos três status", () => {
        expect(LABEL_STATUS_NEGOCIO).toEqual({ aberto: "Em aberto", ganho: "Ganho", perdido: "Perdido" });
    });
    it("lista de motivos termina em Outro", () => {
        expect(MOTIVOS_PERDA[MOTIVOS_PERDA.length - 1]).toBe("Outro");
        expect(MOTIVOS_PERDA).toContain("Preço");
    });
});
