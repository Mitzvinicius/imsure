import type { Membro, Prioridade, StatusTarefa, TarefaLinha, Vinculo } from "./tipos";

/** Select usado em toda leitura de tarefa (painel, página, diálogo). */
export const SELECT_TAREFA =
    "id, corretora_id, titulo, descricao, prioridade, status, prazo, prazo_hora, concluida_em, criado_em, " +
    "negocio_id, apolice_id, sinistro_id, contato_id, " +
    "responsavel:usuarios!tarefas_responsavel_usuario_id_fkey(id, nome), criador:usuarios!tarefas_criado_por_fkey(id, nome), " +
    "negocio:negocios(ramo, contato:contatos(nome)), apolice:apolices(numero, contato:contatos(nome)), " +
    "sinistro:sinistros(tipo, apolice:apolices(numero, contato:contatos(nome))), contato:contatos(nome)";

type Um<T> = T | T[] | null;
function um<T>(v: Um<T>): T | null {
    return Array.isArray(v) ? (v[0] ?? null) : v;
}
type Nome = { nome: string };

export type TarefaBruta = {
    id: string; corretora_id: string; titulo: string; descricao: string | null; prioridade: Prioridade; status: StatusTarefa;
    prazo: string | null; prazo_hora: string | null; concluida_em: string | null; criado_em: string;
    negocio_id: string | null; apolice_id: string | null; sinistro_id: string | null; contato_id: string | null;
    responsavel: Um<Membro>; criador: Um<Membro>;
    negocio: Um<{ ramo: string; contato: Um<Nome> }>;
    apolice: Um<{ numero: string; contato: Um<Nome> }>;
    sinistro: Um<{ tipo: string; apolice: Um<{ numero: string; contato: Um<Nome> }> }>;
    contato: Um<Nome>;
};

function rotulo(b: TarefaBruta): string | null {
    if (b.negocio_id) {
        const n = um(b.negocio);
        return n ? `Negócio ${n.ramo} · ${um(n.contato)?.nome ?? "—"}` : "Negócio";
    }
    if (b.apolice_id) {
        const a = um(b.apolice);
        return a ? `Apólice ${a.numero} · ${um(a.contato)?.nome ?? "—"}` : "Apólice";
    }
    if (b.sinistro_id) {
        const s = um(b.sinistro);
        const a = s ? um(s.apolice) : null;
        return s ? `Sinistro ${s.tipo} · ${(a && um(a.contato)?.nome) ?? "—"}` : "Sinistro";
    }
    if (b.contato_id) return um(b.contato)?.nome ?? "Contato";
    return null;
}

export function normalizarTarefa(b: TarefaBruta): TarefaLinha {
    const vinculo: Vinculo | null = b.negocio_id ? { tipo: "negocio", id: b.negocio_id }
        : b.apolice_id ? { tipo: "apolice", id: b.apolice_id }
        : b.sinistro_id ? { tipo: "sinistro", id: b.sinistro_id }
        : b.contato_id ? { tipo: "contato", id: b.contato_id }
        : null;
    return {
        id: b.id, corretora_id: b.corretora_id, titulo: b.titulo, descricao: b.descricao, prioridade: b.prioridade, status: b.status,
        prazo: b.prazo, prazo_hora: b.prazo_hora, concluida_em: b.concluida_em, criado_em: b.criado_em,
        responsavel: um(b.responsavel) ?? { id: "", nome: "—" },
        criador: um(b.criador) ?? { id: "", nome: "—" },
        vinculo,
        rotuloVinculo: rotulo(b),
    };
}
