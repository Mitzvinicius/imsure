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
