import { describe, expect, it } from "vitest";
import { CARGOS_PADRAO, PERMISSOES, caminhoSeguro, linkConvite, mensagemWhatsappConvite, textoUsoPlano } from "./permissoes";

describe("catálogo", () => {
    it("tem as 11 permissões do spec", () => {
        expect(PERMISSOES.map((p) => p.chave).sort()).toEqual([
            "apolices.excluir", "carteira.transferir", "configuracoes.editar", "contatos.financeiro.ver",
            "contatos.saude.ver", "equipe.equipes", "equipe.membros", "negocios.excluir",
            "parcelas.baixa", "plano.gerenciar", "sinistros.excluir",
        ]);
    });
    it("administrador tem todas", () => {
        expect(CARGOS_PADRAO.administrador.permissoes.length).toBe(11);
        expect(CARGOS_PADRAO.administrador.escopo).toBe("tudo");
    });
    it("gerente não vê saúde nem mexe em configurações/plano/membros", () => {
        const g = CARGOS_PADRAO.gerente.permissoes;
        expect(g).toContain("carteira.transferir");
        expect(g).toContain("equipe.equipes");
        expect(g).not.toContain("contatos.saude.ver");
        expect(g).not.toContain("configuracoes.editar");
        expect(g).not.toContain("plano.gerenciar");
        expect(g).not.toContain("equipe.membros");
    });
    it("financeiro mexe em configurações e plano, não exclui nem vê saúde", () => {
        const f = CARGOS_PADRAO.financeiro.permissoes;
        expect(f).toEqual(expect.arrayContaining(["configuracoes.editar", "plano.gerenciar", "parcelas.baixa"]));
        expect(f).not.toContain("apolices.excluir");
        expect(f).not.toContain("contatos.saude.ver");
    });
    it("operacional vê saúde, dá baixa, não exclui", () => {
        const o = CARGOS_PADRAO.operacional.permissoes;
        expect(o).toEqual(expect.arrayContaining(["contatos.saude.ver", "parcelas.baixa"]));
        expect(o).not.toContain("negocios.excluir");
    });
    it("produtor tem escopo própria carteira e não dá baixa", () => {
        expect(CARGOS_PADRAO.produtor.escopo).toBe("propria");
        expect(CARGOS_PADRAO.produtor.permissoes).not.toContain("parcelas.baixa");
        expect(CARGOS_PADRAO.produtor.permissoes).toContain("contatos.saude.ver");
    });
});

describe("textos", () => {
    it("uso do plano", () => {
        expect(textoUsoPlano({ usados: 4, limite: 5, plano: "Pro" })).toBe("4 de 5 usuários do plano Pro");
    });
    it("link e mensagem de convite", () => {
        expect(linkConvite("http://localhost:3000", "abc")).toBe("http://localhost:3000/convite/abc");
        expect(mensagemWhatsappConvite({ corretora: "Mit Corretora", cargo: "Produtor", link: "http://x/convite/abc" }))
            .toBe("Olá! Você foi convidado(a) para a equipe da Mit Corretora no imsure como Produtor. Acesse: http://x/convite/abc (o link vale por 7 dias)");
    });
});

describe("caminhoSeguro", () => {
    it("aceita caminhos internos", () => {
        expect(caminhoSeguro("/convite/abc")).toBe("/convite/abc");
    });
    it("recusa externos, protocolo relativo e vazio", () => {
        expect(caminhoSeguro("https://malicioso.com")).toBe("/contas");
        expect(caminhoSeguro("//malicioso.com")).toBe("/contas");
        expect(caminhoSeguro("/\\malicioso.com")).toBe("/contas");
        expect(caminhoSeguro(null)).toBe("/contas");
        expect(caminhoSeguro("")).toBe("/contas");
    });
});
