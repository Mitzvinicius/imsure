import { describe, expect, it } from "vitest";
import { formatCpf, formatMoeda, formatPercentual, mascaraMoeda, mascaraPercentual } from "./masks";

describe("mascaraMoeda", () => {
    it("preenche da direita para a esquerda", () => {
        expect(mascaraMoeda("123456")).toEqual({ texto: "1.234,56", valor: 1234.56 });
        expect(mascaraMoeda("5")).toEqual({ texto: "0,05", valor: 0.05 });
        expect(mascaraMoeda("000123")).toEqual({ texto: "1,23", valor: 1.23 });
    });
    it("um dígito a mais no texto já formatado empurra a vírgula", () => {
        expect(mascaraMoeda("1.234,567")).toEqual({ texto: "12.345,67", valor: 12345.67 });
    });
    it("apagar tudo devolve vazio", () => {
        expect(mascaraMoeda("")).toEqual({ texto: "", valor: null });
        expect(mascaraMoeda("0,0")).toEqual({ texto: "", valor: null });
    });
    it("negativo só quando permitido", () => {
        expect(mascaraMoeda("-1500", true)).toEqual({ texto: "-15,00", valor: -15 });
        expect(mascaraMoeda("-1500")).toEqual({ texto: "15,00", valor: 15 });
    });
    it("limita a 12 dígitos (numeric(12,2))", () => {
        expect(mascaraMoeda("1234567890123").valor).toBe(1234567890.12);
    });
});

describe("formatMoeda", () => {
    it("formata número para exibição no campo", () => {
        expect(formatMoeda(1234.5)).toBe("1.234,50");
        expect(formatMoeda(-15)).toBe("-15,00");
        expect(formatMoeda(null)).toBe("");
    });
});

describe("mascaraPercentual", () => {
    it("duas casas, da direita para a esquerda", () => {
        expect(mascaraPercentual("1500")).toEqual({ texto: "15,00", valor: 15 });
        expect(mascaraPercentual("1250")).toEqual({ texto: "12,50", valor: 12.5 });
    });
    it("não passa de 100", () => {
        expect(mascaraPercentual("10001")).toEqual({ texto: "100,00", valor: 100 });
    });
    it("vazio", () => {
        expect(mascaraPercentual("")).toEqual({ texto: "", valor: null });
    });
    it("formatPercentual", () => {
        expect(formatPercentual(33.3)).toBe("33,30");
        expect(formatPercentual(null)).toBe("");
    });
});

describe("formatCpf", () => {
    it("aplica máscara e corta em 11 dígitos", () => {
        expect(formatCpf("12345678901234")).toBe("123.456.789-01");
        expect(formatCpf("1234")).toBe("123.4");
    });
});
