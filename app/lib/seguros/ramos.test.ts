import { describe, expect, it } from "vitest";
import { RAMOS_OPCOES, tipoBemDoRamo } from "./ramos";

describe("tipoBemDoRamo", () => {
    it("mapeia os quatro ramos estruturados", () => {
        expect(tipoBemDoRamo("Automóvel")).toBe("auto");
        expect(tipoBemDoRamo("Residencial")).toBe("residencial");
        expect(tipoBemDoRamo("Vida Individual")).toBe("vida");
        expect(tipoBemDoRamo("Resp. Civil Profissional")).toBe("rc");
    });
    it("demais ramos usam descrição livre", () => {
        expect(tipoBemDoRamo("Empresarial")).toBe("livre");
        expect(tipoBemDoRamo("Ramo inventado")).toBe("livre");
    });
    it("mantém a lista do onboarding", () => {
        expect(RAMOS_OPCOES).toEqual([
            "Automóvel", "Vida Individual", "Residencial",
            "Resp. Civil Profissional", "Empresarial", "Saúde",
        ]);
    });
});
