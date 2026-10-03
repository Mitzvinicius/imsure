import { describe, expect, it } from "vitest";
import { nomeSeguroParaStorage } from "./arquivos";

describe("nomeSeguroParaStorage", () => {
    it("remove acentos e caracteres que o Storage recusa", () => {
        expect(nomeSeguroParaStorage("Apólice Porto.pdf")).toBe("Apolice_Porto.pdf");
        expect(nomeSeguroParaStorage("endosso_2ª via (final).PDF")).toBe("endosso_2a_via_final_.PDF");
    });
    it("nunca devolve vazio", () => {
        expect(nomeSeguroParaStorage("çççç")).toBe("cccc");
        expect(nomeSeguroParaStorage("###")).toBe("arquivo");
    });
});
