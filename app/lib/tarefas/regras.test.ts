import { describe, expect, it } from "vitest";
import {
    agruparPorPrazo, compararTarefas, consultaMencaoAtiva, extrairMencoes, filtrarTarefas, grupoPrazo,
    inserirMencao, linkAlvo, paramsAlvo, segmentarMencoes, tempoRelativo, textoOutrasCorretoras, textoPrazo, validarTarefa, visoesDisponiveis,
} from "./regras";
import type { DadosTarefa, Prioridade, TarefaLinha } from "./tipos";

const HOJE = "2026-10-10";

function t(p: Partial<TarefaLinha> & { id: string }): TarefaLinha {
    return {
        corretora_id: "c", titulo: p.id, descricao: null, prioridade: "media", status: "a_fazer", prazo: null, prazo_hora: null,
        concluida_em: null, criado_em: "2026-10-01T12:00:00Z", responsavel: { id: "eu", nome: "Eu" }, criador: { id: "eu", nome: "Eu" },
        vinculo: null, rotuloVinculo: null, ...p,
    };
}

describe("grupoPrazo", () => {
    it("classifica por prazo em relação a hoje", () => {
        expect(grupoPrazo(null, HOJE)).toBe("sem_prazo");
        expect(grupoPrazo("2026-10-09", HOJE)).toBe("atrasadas");
        expect(grupoPrazo("2026-10-10", HOJE)).toBe("hoje");
        expect(grupoPrazo("2026-10-11", HOJE)).toBe("proximos7");
        expect(grupoPrazo("2026-10-17", HOJE)).toBe("proximos7");
        expect(grupoPrazo("2026-10-18", HOJE)).toBe("depois");
    });
    it("vira o mês corretamente", () => {
        expect(grupoPrazo("2026-11-02", "2026-10-31")).toBe("proximos7");
    });
});

describe("ordenação e agrupamento", () => {
    it("prazo, depois hora, depois prioridade (alta primeiro), sem prazo por último", () => {
        const lista = [
            t({ id: "sem" }),
            t({ id: "b-baixa", prazo: "2026-10-12", prioridade: "baixa" }),
            t({ id: "b-alta", prazo: "2026-10-12", prioridade: "alta" }),
            t({ id: "a-15h", prazo: "2026-10-11", prazo_hora: "15:00:00" }),
            t({ id: "a-9h", prazo: "2026-10-11", prazo_hora: "09:00:00" }),
            t({ id: "a-sem-hora", prazo: "2026-10-11" }),
        ];
        expect([...lista].sort(compararTarefas).map((x) => x.id)).toEqual(["a-9h", "a-15h", "a-sem-hora", "b-alta", "b-baixa", "sem"]);
    });
    it("agrupa e ordena dentro do grupo", () => {
        const g = agruparPorPrazo([
            t({ id: "x", prazo: "2026-10-05" }), t({ id: "y", prazo: "2026-10-10", prioridade: "baixa" }),
            t({ id: "z", prazo: "2026-10-10", prioridade: "alta" }), t({ id: "w" }), t({ id: "v", prazo: "2026-12-01" }),
        ], HOJE);
        expect(g.atrasadas.map((x) => x.id)).toEqual(["x"]);
        expect(g.hoje.map((x) => x.id)).toEqual(["z", "y"]);
        expect(g.proximos7).toEqual([]);
        expect(g.depois.map((x) => x.id)).toEqual(["v"]);
        expect(g.sem_prazo.map((x) => x.id)).toEqual(["w"]);
    });
});

describe("textos", () => {
    it("textoPrazo", () => {
        expect(textoPrazo(null, null, HOJE)).toBe("Sem prazo");
        expect(textoPrazo("2026-10-10", "14:30:00", HOJE)).toBe("Hoje 14:30");
        expect(textoPrazo("2026-10-11", null, HOJE)).toBe("Amanhã");
        expect(textoPrazo("2026-10-09", null, HOJE)).toBe("Ontem");
        expect(textoPrazo("2026-10-20", "08:00", HOJE)).toBe("20/10/2026 08:00");
    });
    it("tempoRelativo", () => {
        const agora = new Date("2026-10-10T15:00:00Z");
        expect(tempoRelativo("2026-10-10T14:59:40Z", agora)).toBe("agora");
        expect(tempoRelativo("2026-10-10T14:55:00Z", agora)).toBe("há 5 min");
        expect(tempoRelativo("2026-10-10T12:00:00Z", agora)).toBe("há 3 h");
        expect(tempoRelativo("2026-10-09T12:00:00Z", agora)).toBe("ontem");
        expect(tempoRelativo("2026-10-01T12:00:00Z", agora)).toBe("01/10");
    });
});

describe("menções", () => {
    const membros = [{ id: "ana", nome: "Ana" }, { id: "anap", nome: "Ana Paula" }, { id: "bia", nome: "Bia Souza" }];
    it("nome mais longo vence e ignora maiúsculas", () => {
        expect(extrairMencoes("@ana paula pode ver?", membros)).toEqual(["anap"]);
        expect(extrairMencoes("@Ana, veja isso", membros)).toEqual(["ana"]);
    });
    it("não confunde e-mail nem nome que só começa igual", () => {
        expect(extrairMencoes("mande para joao@ana.com", membros)).toEqual([]);
        expect(extrairMencoes("@Anabela chegou", membros)).toEqual([]);
    });
    it("várias menções, sem repetir", () => {
        expect(extrairMencoes("@Bia Souza e @Ana; de novo @bia souza", membros)).toEqual(["bia", "ana"]);
    });
    it("segmenta para destacar", () => {
        expect(segmentarMencoes("Oi @Ana Paula, tudo?", ["Ana", "Ana Paula"])).toEqual([
            { texto: "Oi ", mencao: false }, { texto: "@Ana Paula", mencao: true }, { texto: ", tudo?", mencao: false },
        ]);
        expect(segmentarMencoes("sem menção", ["Ana"])).toEqual([{ texto: "sem menção", mencao: false }]);
    });
    it("consulta ativa do autocomplete", () => {
        expect(consultaMencaoAtiva("Oi @an", 6)).toEqual({ inicio: 3, termo: "an" });
        expect(consultaMencaoAtiva("Oi @Ana P", 9)).toEqual({ inicio: 3, termo: "Ana P" });
        expect(consultaMencaoAtiva("joao@an", 7)).toBeNull();
        expect(consultaMencaoAtiva("@an\nx", 5)).toBeNull();
        expect(consultaMencaoAtiva("@an", -1)).toBeNull();
    });
    it("inserirMencao troca o termo pelo nome e posiciona o cursor", () => {
        expect(inserirMencao("Oi @an tudo", 3, 6, "Ana Paula")).toEqual({ texto: "Oi @Ana Paula  tudo", cursor: 14 });
    });
});

describe("filtros", () => {
    const lista = [
        t({ id: "minha", responsavel: { id: "eu", nome: "Eu" }, criador: { id: "chefe", nome: "Chefe" }, prioridade: "alta" }),
        t({ id: "criei", responsavel: { id: "col", nome: "Col" }, criador: { id: "eu", nome: "Eu" }, vinculo: { tipo: "apolice", id: "a" } }),
        t({ id: "inativo", responsavel: { id: "saiu", nome: "Saiu" }, criador: { id: "chefe", nome: "Chefe" } }),
    ];
    const ctx = { usuarioId: "eu", membrosAtivos: new Set(["eu", "col", "chefe"]) };
    const ids = (visao: "minhas" | "criadas" | "equipe" | "todas" | "sem_responsavel", prioridade: Prioridade | "" = "", tipo: "" | "avulsa" | "apolice" = "") =>
        filtrarTarefas(lista, { visao, prioridade, tipo }, ctx).map((x) => x.id);
    it("visões", () => {
        expect(ids("minhas")).toEqual(["minha"]);
        expect(ids("criadas")).toEqual(["criei"]);
        expect(ids("equipe")).toEqual(["criei", "inativo"]);
        expect(ids("todas")).toEqual(["minha", "criei", "inativo"]);
        expect(ids("sem_responsavel")).toEqual(["inativo"]);
    });
    it("prioridade e tipo de registro", () => {
        expect(ids("todas", "alta")).toEqual(["minha"]);
        expect(ids("todas", "", "apolice")).toEqual(["criei"]);
        expect(ids("todas", "", "avulsa")).toEqual(["minha", "inativo"]);
    });
});

describe("alvos e links", () => {
    it("paramsAlvo preenche só a coluna do alvo", () => {
        expect(paramsAlvo({ tipo: "sinistro", id: "s1" })).toEqual({ p_negocio_id: null, p_apolice_id: null, p_sinistro_id: "s1", p_contato_id: null, p_tarefa_id: null });
        expect(paramsAlvo(null)).toEqual({ p_negocio_id: null, p_apolice_id: null, p_sinistro_id: null, p_contato_id: null, p_tarefa_id: null });
    });
    it("links iguais aos do banco", () => {
        expect(linkAlvo("c", { tipo: "negocio", id: "n" })).toBe("/corretoras/c/funis?negocio=n");
        expect(linkAlvo("c", { tipo: "apolice", id: "a" })).toBe("/corretoras/c/apolices/a?aba=atividades");
        expect(linkAlvo("c", { tipo: "sinistro", id: "s" })).toBe("/corretoras/c/sinistros/s");
        expect(linkAlvo("c", { tipo: "contato", id: "p" })).toBe("/corretoras/c/contatos/p?aba=atividades");
        expect(linkAlvo("c", { tipo: "tarefa", id: "t" })).toBe("/corretoras/c/tarefas?tarefa=t");
    });
});

describe("validarTarefa", () => {
    const base: DadosTarefa = { titulo: "Ligar", descricao: "", responsavelId: "eu", prazo: null, prazoHora: null, prioridade: "media", status: "a_fazer" };
    it("aceita o mínimo", () => expect(validarTarefa(base)).toBeNull());
    it("recusa título vazio, longo, hora sem data e sem responsável", () => {
        expect(validarTarefa({ ...base, titulo: "   " })).toBe("Dê um título para a tarefa.");
        expect(validarTarefa({ ...base, titulo: "x".repeat(201) })).toBe("O título pode ter no máximo 200 caracteres.");
        expect(validarTarefa({ ...base, prazoHora: "10:00" })).toBe("Escolha a data do prazo antes da hora.");
        expect(validarTarefa({ ...base, responsavelId: "" })).toBe("Escolha o responsável.");
    });
});

describe("visões disponíveis", () => {
    const valores = (p: Parameters<typeof visoesDisponiveis>[0]) => visoesDisponiveis(p).map((v) => v.valor);
    it("produtor: minhas, criadas e todas (o que ele enxerga)", () => {
        expect(valores({ escopo: "propria", lider: false, podeGerirMembros: false })).toEqual(["minhas", "criadas", "todas"]);
    });
    it("líder ganha equipe; gestor de membros ganha sem responsável", () => {
        expect(valores({ escopo: "propria", lider: true, podeGerirMembros: false })).toEqual(["minhas", "criadas", "equipe", "todas"]);
        expect(valores({ escopo: "tudo", lider: false, podeGerirMembros: true })).toEqual(["minhas", "criadas", "todas", "sem_responsavel"]);
    });
});

describe("textoOutrasCorretoras", () => {
    it("singular, plural e nada", () => {
        expect(textoOutrasCorretoras(0)).toBeNull();
        expect(textoOutrasCorretoras(1)).toBe("1 não lida em outras corretoras");
        expect(textoOutrasCorretoras(3)).toBe("3 não lidas em outras corretoras");
    });
});
