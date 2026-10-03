import { describe, expect, it } from "vitest";
import { LABEL_TIPO_BEM, ramoPodeVincularBem, situacaoSeguroBem, totalPatrimonio } from "./patrimonio";

describe("ramoPodeVincularBem", () => {
    it("auto, residencial e empresarial podem", () => {
        expect(ramoPodeVincularBem("Automóvel")).toBe(true);
        expect(ramoPodeVincularBem("Residencial")).toBe(true);
        expect(ramoPodeVincularBem("Empresarial")).toBe(true);
    });
    it("vida, saúde e RC não", () => {
        expect(ramoPodeVincularBem("Vida Individual")).toBe(false);
        expect(ramoPodeVincularBem("Saúde")).toBe(false);
        expect(ramoPodeVincularBem("Resp. Civil Profissional")).toBe(false);
    });
});

describe("situacaoSeguroBem", () => {
    it("segurado se alguma apólice vinculada está vigente", () => {
        expect(situacaoSeguroBem(["vencida", "vigente"])).toBe("segurado");
    });
    it("seguro vencido se só há apólices vencidas, canceladas ou renovadas", () => {
        expect(situacaoSeguroBem(["vencida"])).toBe("seguro_vencido");
        expect(situacaoSeguroBem(["cancelada", "renovada"])).toBe("seguro_vencido");
    });
    it("sem seguro quando não há apólice vinculada", () => {
        expect(situacaoSeguroBem([])).toBe("sem_seguro");
    });
});

describe("totalPatrimonio", () => {
    it("soma valores e ignora vazios", () => {
        expect(totalPatrimonio([{ valor_estimado: 350000 }, { valor_estimado: null }, { valor_estimado: 89900.5 }])).toBe(439900.5);
        expect(totalPatrimonio([])).toBe(0);
    });
});

describe("rótulos", () => {
    it("três tipos de bem", () => {
        expect(LABEL_TIPO_BEM).toEqual({ imovel: "Imóvel", veiculo: "Veículo", outro: "Outro" });
    });
});
