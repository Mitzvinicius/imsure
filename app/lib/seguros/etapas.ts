export type StatusNegocio = "aberto" | "ganho" | "perdido";

export const LABEL_STATUS_NEGOCIO: Record<StatusNegocio, string> = {
    aberto: "Em aberto",
    ganho: "Ganho",
    perdido: "Perdido",
};

export const MOTIVOS_PERDA = [
    "Preço",
    "Fechou com concorrente",
    "Cliente desistiu",
    "Sem retorno do cliente",
    "Recusado pela seguradora",
    "Outro",
] as const;

function normalizar(s: string) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function indiceEtapaEmissao(nomes: string[]): number {
    return nomes.findIndex((n) => /emitid|emissao/.test(normalizar(n)));
}
