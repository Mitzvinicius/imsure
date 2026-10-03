import { describe, expect, it } from "vitest";
import { statusDoRamo, statusValidoParaRamo, tiposSinistroDoRamo } from "./sinistros";

describe("statusDoRamo", () => {
    it("auto inclui vistoria e oficina entre análise e aprovado", () => {
        expect(statusDoRamo("Automóvel")).toEqual([
            "aberto", "em_analise", "vistoria", "em_oficina", "documentacao_pendente",
            "aprovado", "negado", "indenizado", "encerrado",
        ]);
    });
    it("demais ramos usam a lista base", () => {
        expect(statusDoRamo("Residencial")).toEqual([
            "aberto", "em_analise", "documentacao_pendente", "aprovado", "negado", "indenizado", "encerrado",
        ]);
    });
});

describe("statusValidoParaRamo", () => {
    it("vistoria só vale para auto", () => {
        expect(statusValidoParaRamo("vistoria", "Automóvel")).toBe(true);
        expect(statusValidoParaRamo("vistoria", "Residencial")).toBe(false);
        expect(statusValidoParaRamo("inexistente", "Automóvel")).toBe(false);
    });
});

describe("tiposSinistroDoRamo", () => {
    it("auto tem colisão e roubo; livre tem 'Outro'", () => {
        expect(tiposSinistroDoRamo("Automóvel")).toContain("Colisão");
        expect(tiposSinistroDoRamo("Automóvel")).toContain("Roubo/Furto");
        expect(tiposSinistroDoRamo("Saúde")).toEqual(["Outro"]);
    });
});
