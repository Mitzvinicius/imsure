import { describe, expect, it } from "vitest";
import { normalizarTarefa, type TarefaBruta } from "./consultas";

const base: TarefaBruta = {
    id: "t1", corretora_id: "c", titulo: "Cobrar vistoria", descricao: null, prioridade: "alta", status: "a_fazer",
    prazo: "2026-10-10", prazo_hora: null, concluida_em: null, criado_em: "2026-10-01T00:00:00Z",
    negocio_id: null, apolice_id: null, sinistro_id: null, contato_id: null,
    responsavel: { id: "u1", nome: "Ana" }, criador: { id: "u2", nome: "Bia" },
    negocio: null, apolice: null, sinistro: null, contato: null,
};

describe("normalizarTarefa", () => {
    it("avulsa", () => {
        const t = normalizarTarefa(base);
        expect(t.vinculo).toBeNull();
        expect(t.rotuloVinculo).toBeNull();
        expect(t.responsavel).toEqual({ id: "u1", nome: "Ana" });
        expect(t.criador).toEqual({ id: "u2", nome: "Bia" });
    });
    it("rótulos por tipo de registro", () => {
        expect(normalizarTarefa({ ...base, negocio_id: "n", negocio: { ramo: "Automóvel", contato: { nome: "João" } } }).rotuloVinculo).toBe("Negócio Automóvel · João");
        expect(normalizarTarefa({ ...base, apolice_id: "a", apolice: { numero: "123", contato: [{ nome: "João" }] } }).rotuloVinculo).toBe("Apólice 123 · João");
        expect(normalizarTarefa({ ...base, sinistro_id: "s", sinistro: { tipo: "Colisão", apolice: { numero: "123", contato: { nome: "João" } } } }).rotuloVinculo).toBe("Sinistro Colisão · João");
        expect(normalizarTarefa({ ...base, contato_id: "p", contato: { nome: "João" } })).toMatchObject({ vinculo: { tipo: "contato", id: "p" }, rotuloVinculo: "João" });
    });
    it("registro sem acesso vira rótulo genérico", () => {
        expect(normalizarTarefa({ ...base, apolice_id: "a", apolice: null }).rotuloVinculo).toBe("Apólice");
    });
});
