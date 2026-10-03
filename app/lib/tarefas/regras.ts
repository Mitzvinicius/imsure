import { formatData, somarDias } from "@/app/lib/seguros/datas";
import type { Alvo, DadosTarefa, Membro, Prioridade, StatusTarefa, TipoVinculo, Vinculo } from "./tipos";

export const LABEL_PRIORIDADE: Record<Prioridade, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
export const COR_PRIORIDADE: Record<Prioridade, "default" | "warning" | "error"> = { baixa: "default", media: "warning", alta: "error" };
export const LABEL_STATUS_TAREFA: Record<StatusTarefa, string> = {
    a_fazer: "A fazer", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada",
};
export const LABEL_TIPO_VINCULO: Record<TipoVinculo, string> = { negocio: "Negócios", apolice: "Apólices", sinistro: "Sinistros", contato: "Contatos" };

export type GrupoPrazo = "atrasadas" | "hoje" | "proximos7" | "depois" | "sem_prazo";
export const GRUPOS_PRAZO: { chave: GrupoPrazo; rotulo: string }[] = [
    { chave: "atrasadas", rotulo: "Atrasadas" },
    { chave: "hoje", rotulo: "Hoje" },
    { chave: "proximos7", rotulo: "Próximos 7 dias" },
    { chave: "depois", rotulo: "Depois" },
    { chave: "sem_prazo", rotulo: "Sem prazo" },
];

export function tarefaAberta(status: StatusTarefa): boolean {
    return status === "a_fazer" || status === "em_andamento";
}

export function grupoPrazo(prazo: string | null, hoje: string): GrupoPrazo {
    if (!prazo) return "sem_prazo";
    if (prazo < hoje) return "atrasadas";
    if (prazo === hoje) return "hoje";
    if (prazo <= somarDias(hoje, 7)) return "proximos7";
    return "depois";
}

type Ordenavel = { prazo: string | null; prazo_hora: string | null; prioridade: Prioridade; titulo: string };
const PESO_PRIORIDADE: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

function compararNulosPorUltimo(a: string | null, b: string | null): number {
    if (a === b) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return a < b ? -1 : 1;
}

export function compararTarefas(a: Ordenavel, b: Ordenavel): number {
    return compararNulosPorUltimo(a.prazo, b.prazo)
        || compararNulosPorUltimo(a.prazo_hora?.slice(0, 5) ?? null, b.prazo_hora?.slice(0, 5) ?? null)
        || PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade]
        || a.titulo.localeCompare(b.titulo, "pt-BR");
}

export function agruparPorPrazo<T extends Ordenavel>(tarefas: T[], hoje: string): Record<GrupoPrazo, T[]> {
    const grupos: Record<GrupoPrazo, T[]> = { atrasadas: [], hoje: [], proximos7: [], depois: [], sem_prazo: [] };
    for (const t of [...tarefas].sort(compararTarefas)) grupos[grupoPrazo(t.prazo, hoje)].push(t);
    return grupos;
}

export function textoPrazo(prazo: string | null, hora: string | null, hoje: string): string {
    if (!prazo) return "Sem prazo";
    const dia = prazo === hoje ? "Hoje"
        : prazo === somarDias(hoje, 1) ? "Amanhã"
        : prazo === somarDias(hoje, -1) ? "Ontem"
        : formatData(prazo);
    return hora ? `${dia} ${hora.slice(0, 5)}` : dia;
}

const FORMATO_DIA_MES = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

export function tempoRelativo(iso: string, agora: Date): string {
    const minutos = Math.floor((agora.getTime() - new Date(iso).getTime()) / 60000);
    if (minutos < 1) return "agora";
    if (minutos < 60) return `há ${minutos} min`;
    if (minutos < 24 * 60) return `há ${Math.floor(minutos / 60)} h`;
    if (minutos < 48 * 60) return "ontem";
    return FORMATO_DIA_MES.format(new Date(iso));
}

// ===== Menções =====
// Formato no texto: "@Nome Completo". O nome mais longo vence ("Ana Paula" antes de "Ana");
// "@" grudado em letra/número (e-mail) não é menção; o nome precisa terminar em fronteira de palavra.
const ANTES_INVALIDO = /[\p{L}\p{N}._-]/u;
const LETRA_OU_NUMERO = /[\p{L}\p{N}]/u;

function encontrarMencoes(texto: string, nomes: string[]): { inicio: number; fim: number; nome: string }[] {
    const ordenados = [...new Set(nomes)].sort((a, b) => b.length - a.length);
    const baixo = texto.toLocaleLowerCase("pt-BR");
    const achados: { inicio: number; fim: number; nome: string }[] = [];
    let ultimoFim = 0;
    for (let i = baixo.indexOf("@"); i !== -1; i = baixo.indexOf("@", i + 1)) {
        if (i < ultimoFim) continue;
        if (i > 0 && ANTES_INVALIDO.test(baixo[i - 1])) continue;
        const resto = baixo.slice(i + 1);
        const nome = ordenados.find((n) => {
            const nb = n.toLocaleLowerCase("pt-BR");
            return resto.startsWith(nb) && !LETRA_OU_NUMERO.test(resto.charAt(nb.length));
        });
        if (!nome) continue;
        achados.push({ inicio: i, fim: i + 1 + nome.length, nome });
        ultimoFim = i + 1 + nome.length;
    }
    return achados;
}

export function extrairMencoes(texto: string, membros: Membro[]): string[] {
    const ids: string[] = [];
    for (const { nome } of encontrarMencoes(texto, membros.map((m) => m.nome))) {
        const membro = membros.find((m) => m.nome === nome);
        if (membro && !ids.includes(membro.id)) ids.push(membro.id);
    }
    return ids;
}

export function segmentarMencoes(texto: string, nomes: string[]): { texto: string; mencao: boolean }[] {
    const partes: { texto: string; mencao: boolean }[] = [];
    let cursor = 0;
    for (const m of encontrarMencoes(texto, nomes)) {
        if (m.inicio > cursor) partes.push({ texto: texto.slice(cursor, m.inicio), mencao: false });
        partes.push({ texto: texto.slice(m.inicio, m.fim), mencao: true });
        cursor = m.fim;
    }
    if (cursor < texto.length) partes.push({ texto: texto.slice(cursor), mencao: false });
    return partes;
}

export function consultaMencaoAtiva(texto: string, cursor: number): { inicio: number; termo: string } | null {
    if (cursor < 0) return null;
    const antes = texto.slice(0, cursor);
    const inicio = antes.lastIndexOf("@");
    if (inicio === -1) return null;
    if (inicio > 0 && ANTES_INVALIDO.test(antes[inicio - 1])) return null;
    const termo = antes.slice(inicio + 1);
    if (termo.length > 30 || /[\n@]/.test(termo) || /\s\s/.test(termo) || termo.startsWith(" ")) return null;
    return { inicio, termo };
}

export function inserirMencao(texto: string, inicio: number, cursor: number, nome: string): { texto: string; cursor: number } {
    return { texto: `${texto.slice(0, inicio)}@${nome} ${texto.slice(cursor)}`, cursor: inicio + nome.length + 2 };
}

// ===== Filtros da página de tarefas =====
export type VisaoTarefas = "minhas" | "criadas" | "equipe" | "todas" | "sem_responsavel";
export type FiltrosTarefas = { visao: VisaoTarefas; prioridade: Prioridade | ""; tipo: TipoVinculo | "avulsa" | "" };

/** "Todas" = tudo o que a pessoa enxerga (a RLS já limita); assim nenhuma tarefa visível fica sem filtro. */
export function visoesDisponiveis(p: { escopo: string; lider: boolean; podeGerirMembros: boolean }): { valor: VisaoTarefas; rotulo: string }[] {
    return [
        { valor: "minhas", rotulo: "Minhas" },
        { valor: "criadas", rotulo: "Criadas por mim" },
        ...(p.lider || p.escopo === "equipe" ? [{ valor: "equipe" as const, rotulo: "Equipe" }] : []),
        { valor: "todas", rotulo: "Todas" },
        ...(p.podeGerirMembros ? [{ valor: "sem_responsavel" as const, rotulo: "Sem responsável ativo" }] : []),
    ];
}

export function textoOutrasCorretoras(n: number): string | null {
    if (n <= 0) return null;
    return n === 1 ? "1 não lida em outras corretoras" : `${n} não lidas em outras corretoras`;
}

export function filtrarTarefas<T extends { responsavel: Membro; criador: Membro; prioridade: Prioridade; vinculo: Vinculo | null }>(
    tarefas: T[],
    f: FiltrosTarefas,
    ctx: { usuarioId: string; membrosAtivos: ReadonlySet<string> },
): T[] {
    return tarefas.filter((t) => {
        const visao = f.visao === "minhas" ? t.responsavel.id === ctx.usuarioId
            : f.visao === "criadas" ? t.criador.id === ctx.usuarioId
            : f.visao === "equipe" ? t.responsavel.id !== ctx.usuarioId
            : f.visao === "sem_responsavel" ? !ctx.membrosAtivos.has(t.responsavel.id)
            : true;
        const prioridade = !f.prioridade || t.prioridade === f.prioridade;
        const tipo = !f.tipo || (f.tipo === "avulsa" ? t.vinculo === null : t.vinculo?.tipo === f.tipo);
        return visao && prioridade && tipo;
    });
}

// ===== Alvos (registro ou tarefa) =====
const COLUNA: Record<Alvo["tipo"], "negocio_id" | "apolice_id" | "sinistro_id" | "contato_id" | "tarefa_id"> = {
    negocio: "negocio_id", apolice: "apolice_id", sinistro: "sinistro_id", contato: "contato_id", tarefa: "tarefa_id",
};

export function colunaAlvo(alvo: Alvo) {
    return COLUNA[alvo.tipo];
}

export function colunasVinculo(v: Vinculo | null) {
    return {
        negocio_id: v?.tipo === "negocio" ? v.id : null,
        apolice_id: v?.tipo === "apolice" ? v.id : null,
        sinistro_id: v?.tipo === "sinistro" ? v.id : null,
        contato_id: v?.tipo === "contato" ? v.id : null,
    };
}

export function paramsAlvo(alvo: Alvo | null) {
    return {
        p_negocio_id: alvo?.tipo === "negocio" ? alvo.id : null,
        p_apolice_id: alvo?.tipo === "apolice" ? alvo.id : null,
        p_sinistro_id: alvo?.tipo === "sinistro" ? alvo.id : null,
        p_contato_id: alvo?.tipo === "contato" ? alvo.id : null,
        p_tarefa_id: alvo?.tipo === "tarefa" ? alvo.id : null,
    };
}

/** Mesmo formato de public.link_alvo no banco. */
export function linkAlvo(corretoraId: string, alvo: Alvo): string {
    const base = `/corretoras/${corretoraId}`;
    switch (alvo.tipo) {
        case "negocio": return `${base}/funis?negocio=${alvo.id}`;
        case "apolice": return `${base}/apolices/${alvo.id}?aba=atividades`;
        case "sinistro": return `${base}/sinistros/${alvo.id}`;
        case "contato": return `${base}/contatos/${alvo.id}?aba=atividades`;
        case "tarefa": return `${base}/tarefas?tarefa=${alvo.id}`;
    }
}

export function validarTarefa(d: DadosTarefa): string | null {
    if (!d.titulo.trim()) return "Dê um título para a tarefa.";
    if (d.titulo.trim().length > 200) return "O título pode ter no máximo 200 caracteres.";
    if (d.prazoHora && !d.prazo) return "Escolha a data do prazo antes da hora.";
    if (!d.responsavelId) return "Escolha o responsável.";
    return null;
}
