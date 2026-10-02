import { describe, expect, it } from "vitest";
import { contarFiltrosAtivos, FILTROS_PADRAO, negocioPassaNoFiltro } from "./filtros";

const base = { contato: { nome: "Ana Souza" }, tipo: "Seguro novo", ramo: "Automóvel", seguradora: "Porto Seguro", criado_em: "2026-09-10T12:00:00Z" };

describe("filtro de status do funil", () => {
    it("por padrão mostra só negócios em aberto", () => {
        expect(FILTROS_PADRAO.status).toBe("aberto");
        expect(negocioPassaNoFiltro({ ...base, status: "aberto" }, "", FILTROS_PADRAO)).toBe(true);
        expect(negocioPassaNoFiltro({ ...base, status: "ganho" }, "", FILTROS_PADRAO)).toBe(false);
        expect(negocioPassaNoFiltro({ ...base, status: "perdido" }, "", FILTROS_PADRAO)).toBe(false);
    });
    it("status vazio mostra todos", () => {
        const todos = { ...FILTROS_PADRAO, status: "" as const };
        expect(negocioPassaNoFiltro({ ...base, status: "ganho" }, "", todos)).toBe(true);
        expect(negocioPassaNoFiltro({ ...base, status: "perdido" }, "", todos)).toBe(true);
    });
    it("filtra só ganhos ou só perdidos", () => {
        expect(negocioPassaNoFiltro({ ...base, status: "ganho" }, "", { ...FILTROS_PADRAO, status: "ganho" })).toBe(true);
        expect(negocioPassaNoFiltro({ ...base, status: "aberto" }, "", { ...FILTROS_PADRAO, status: "ganho" })).toBe(false);
    });
    it("os demais filtros e a busca continuam valendo", () => {
        const n = { ...base, status: "aberto" as const };
        expect(negocioPassaNoFiltro(n, "souza", FILTROS_PADRAO)).toBe(true);
        expect(negocioPassaNoFiltro(n, "carlos", FILTROS_PADRAO)).toBe(false);
        expect(negocioPassaNoFiltro(n, "", { ...FILTROS_PADRAO, ramo: "Residencial" })).toBe(false);
        expect(negocioPassaNoFiltro(n, "", { ...FILTROS_PADRAO, criadoDe: "2026-09-11" })).toBe(false);
    });
});

describe("contarFiltrosAtivos", () => {
    it("o padrão (só em aberto) não conta como filtro ativo", () => {
        expect(contarFiltrosAtivos(FILTROS_PADRAO)).toBe(0);
    });
    it("mudar o status ou outro campo conta", () => {
        expect(contarFiltrosAtivos({ ...FILTROS_PADRAO, status: "" })).toBe(1);
        expect(contarFiltrosAtivos({ ...FILTROS_PADRAO, status: "ganho", ramo: "Automóvel" })).toBe(2);
    });
});
