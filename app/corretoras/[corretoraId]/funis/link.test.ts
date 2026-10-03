import { describe, expect, it } from "vitest";
import { negocioDoLink } from "./link";

const etapasAtivo = [{ id: "e1", nome: "Novo", ordem: 0 }];
const etapasOutro = [{ id: "x1", nome: "Outro", ordem: 0 }];
const n = (id: string) => ({ id }) as never;

describe("negocioDoLink", () => {
    it("sem ?negocio= não abre nada nem avisa", () => {
        expect(negocioDoLink(null, [n("a")], etapasAtivo, null)).toEqual({ detalhe: null, naoEncontrado: false });
    });
    it("negócio do funil ativo usa as etapas do funil ativo", () => {
        expect(negocioDoLink("a", [n("a")], etapasAtivo, null)).toEqual({ detalhe: { negocio: n("a"), etapas: etapasAtivo }, naoEncontrado: false });
    });
    it("negócio de outro funil abre com as etapas do funil dele", () => {
        const fora = { negocio: n("b"), etapas: etapasOutro };
        expect(negocioDoLink("b", [n("a")], etapasAtivo, fora)).toEqual({ detalhe: fora, naoEncontrado: false });
    });
    it("id inexistente (ou sem acesso) avisa que não encontrou", () => {
        expect(negocioDoLink("z", [n("a")], etapasAtivo, null)).toEqual({ detalhe: null, naoEncontrado: true });
    });
    it("negócio de fora de outro link antigo não é usado para outro id", () => {
        expect(negocioDoLink("z", [n("a")], etapasAtivo, { negocio: n("b"), etapas: etapasOutro }).naoEncontrado).toBe(true);
    });
});
