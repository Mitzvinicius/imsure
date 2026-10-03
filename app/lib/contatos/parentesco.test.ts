import { describe, expect, it } from "vitest";
import { LABEL_ESTADO_CIVIL, LABEL_PARENTESCO, PARENTESCOS, parentescoInverso, parentesDoContato, validarNovoParente } from "./parentesco";

describe("parentescoInverso", () => {
    it("relações simétricas continuam iguais", () => {
        expect(parentescoInverso("conjuge")).toBe("conjuge");
        expect(parentescoInverso("irmao")).toBe("irmao");
        expect(parentescoInverso("cunhado")).toBe("cunhado");
    });
    it("relações assimétricas invertem", () => {
        expect(parentescoInverso("filho")).toBe("pai_mae");
        expect(parentescoInverso("pai_mae")).toBe("filho");
        expect(parentescoInverso("avo")).toBe("neto");
        expect(parentescoInverso("neto")).toBe("avo");
        expect(parentescoInverso("sogro")).toBe("genro_nora");
        expect(parentescoInverso("genro_nora")).toBe("sogro");
        expect(parentescoInverso("enteado")).toBe("padrasto_madrasta");
        expect(parentescoInverso("padrasto_madrasta")).toBe("enteado");
    });
    it("inverter duas vezes volta ao original, para todos", () => {
        for (const p of PARENTESCOS) expect(parentescoInverso(parentescoInverso(p))).toBe(p);
    });
    it("todo parentesco tem rótulo", () => {
        for (const p of PARENTESCOS) expect(LABEL_PARENTESCO[p]).toBeTruthy();
        expect(LABEL_PARENTESCO.pai_mae).toBe("Pai/Mãe");
    });
});

describe("validarNovoParente", () => {
    it("exige nome", () => {
        expect(validarNovoParente({ nome: " ", telefone: "11999998888", email: "" })).toMatch(/nome/i);
    });
    it("exige telefone ou e-mail", () => {
        expect(validarNovoParente({ nome: "Ana", telefone: "", email: "" })).toMatch(/telefone ou e-mail/i);
        expect(validarNovoParente({ nome: "Ana", telefone: "11999998888", email: "" })).toBeNull();
        expect(validarNovoParente({ nome: "Ana", telefone: "", email: "ana@x.com" })).toBeNull();
    });
    it("telefone incompleto ou e-mail inválido não contam", () => {
        expect(validarNovoParente({ nome: "Ana", telefone: "1199", email: "" })).toMatch(/telefone/i);
        expect(validarNovoParente({ nome: "Ana", telefone: "", email: "ana@" })).toMatch(/e-mail/i);
    });
});

describe("estado civil", () => {
    it("tem as seis opções", () => {
        expect(Object.keys(LABEL_ESTADO_CIVIL)).toEqual(["solteiro", "casado", "uniao_estavel", "divorciado", "separado", "viuvo"]);
    });
});

describe("parentesDoContato", () => {
    const vinculos = [
        { id: "v1", parentesco: "filho" as const, contato: { id: "joao", nome: "João", telefone: null, email: null }, parente: { id: "pedro", nome: "Pedro", telefone: "1", email: null } },
        { id: "v2", parentesco: "conjuge" as const, contato: { id: "maria", nome: "Maria", telefone: null, email: null }, parente: { id: "joao", nome: "João", telefone: null, email: null } },
    ];
    it("mostra o parente com o grau gravado quando o contato é o dono do vínculo", () => {
        expect(parentesDoContato("joao", vinculos)).toEqual([
            { vinculoId: "v2", parentesco: "conjuge", pessoa: { id: "maria", nome: "Maria", telefone: null, email: null } },
            { vinculoId: "v1", parentesco: "filho", pessoa: { id: "pedro", nome: "Pedro", telefone: "1", email: null } },
        ]);
    });
    it("inverte o grau quando o contato é o parente do vínculo", () => {
        expect(parentesDoContato("pedro", vinculos)).toEqual([
            { vinculoId: "v1", parentesco: "pai_mae", pessoa: { id: "joao", nome: "João", telefone: null, email: null } },
        ]);
    });
});
