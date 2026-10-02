export type StatusApolice = "vigente" | "vencida" | "renovada" | "cancelada";

export const LABEL_STATUS_APOLICE: Record<StatusApolice, string> = {
    vigente: "Vigente",
    vencida: "Vencida",
    renovada: "Renovada",
    cancelada: "Cancelada",
};

export const COR_STATUS_APOLICE: Record<StatusApolice, "success" | "warning" | "info" | "default"> = {
    vigente: "success",
    vencida: "warning",
    renovada: "info",
    cancelada: "default",
};

export function calcularStatusApolice({
    canceladaEm,
    fimVigencia,
    foiRenovada,
    hoje,
}: {
    canceladaEm: string | null;
    fimVigencia: string;
    foiRenovada: boolean;
    hoje: string;
}): StatusApolice {
    if (canceladaEm) return "cancelada";
    if (foiRenovada) return "renovada";
    if (fimVigencia.slice(0, 10) < hoje) return "vencida";
    return "vigente";
}
