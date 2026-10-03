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
    responsavelUsuarioId: null,
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
