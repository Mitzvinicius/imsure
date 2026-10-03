import type { StatusNegocio } from "@/app/lib/seguros/etapas";

export type Filtros = {
    cliente: string;
    tipo: string;
    ramo: string;
    seguradora: string;
    criadoDe: string;
    status: StatusNegocio | "";
};

// Por padrão o funil mostra só negócios em aberto; ganhos/perdidos aparecem ajustando o filtro.
export const FILTROS_PADRAO: Filtros = { cliente: "", tipo: "", ramo: "", seguradora: "", criadoDe: "", status: "aberto" };

type NegocioFiltravel = {
    contato: { nome: string };
    tipo: string;
    ramo: string;
    seguradora: string | null;
    criado_em: string;
    status: StatusNegocio;
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function negocioPassaNoFiltro(n: NegocioFiltravel, busca: string, filtros: Filtros): boolean {
    if (busca.trim() && !norm(n.contato.nome).includes(norm(busca))) return false;
    if (filtros.status && n.status !== filtros.status) return false;
    if (filtros.cliente && !norm(n.contato.nome).includes(norm(filtros.cliente))) return false;
    if (filtros.tipo && n.tipo !== filtros.tipo) return false;
    if (filtros.ramo && n.ramo !== filtros.ramo) return false;
    if (filtros.seguradora && n.seguradora !== filtros.seguradora) return false;
    if (filtros.criadoDe && n.criado_em.slice(0, 10) < filtros.criadoDe) return false;
    return true;
}

export function contarFiltrosAtivos(filtros: Filtros): number {
    return (Object.keys(filtros) as (keyof Filtros)[]).filter((k) => filtros[k] !== FILTROS_PADRAO[k]).length;
}

export function nomeCookieFiltros(corretoraId: string): string {
    return `imsure_filtros_funil_${corretoraId}`;
}

const STATUS_VALIDOS = ["", "aberto", "ganho", "perdido"];

// Cookie vem do navegador: tudo que não for texto válido volta para o padrão.
export function lerFiltrosSalvos(json: string | undefined): Filtros {
    if (!json) return FILTROS_PADRAO;
    let bruto: unknown;
    try {
        bruto = JSON.parse(json);
    } catch {
        return FILTROS_PADRAO;
    }
    if (!bruto || typeof bruto !== "object") return FILTROS_PADRAO;
    const obj = bruto as Record<string, unknown>;
    const texto = (k: keyof Filtros) => (typeof obj[k] === "string" ? (obj[k] as string) : FILTROS_PADRAO[k]);
    const status = typeof obj.status === "string" && STATUS_VALIDOS.includes(obj.status) ? (obj.status as Filtros["status"]) : FILTROS_PADRAO.status;
    return {
        cliente: texto("cliente"),
        tipo: texto("tipo"),
        ramo: texto("ramo"),
        seguradora: texto("seguradora"),
        criadoDe: texto("criadoDe"),
        status,
    };
}
