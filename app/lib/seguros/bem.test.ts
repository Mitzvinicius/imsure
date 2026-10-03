import { describe, expect, it } from "vitest";
import { bemVazioParaRamo } from "./bem";

describe("bemVazioParaRamo", () => {
    it("auto, residencial e rc começam com um item vazio", () => {
        expect(bemVazioParaRamo("Automóvel")).toMatchObject({ tipo: "auto", itens: [{ placa: "" }] });
        expect(bemVazioParaRamo("Residencial")).toMatchObject({ tipo: "residencial", itens: [{ tipo_imovel: "casa" }] });
        expect(bemVazioParaRamo("Resp. Civil Profissional")).toEqual({ tipo: "rc", itens: [{ atividade: "", limite: null }] });
    });
    it("vida começa sem vidas e ramos livres com descrição vazia", () => {
        expect(bemVazioParaRamo("Vida Individual")).toEqual({ tipo: "vida", itens: [] });
        expect(bemVazioParaRamo("Empresarial")).toEqual({ tipo: "livre", descricao: "" });
    });
});
