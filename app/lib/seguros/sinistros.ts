import { tipoBemDoRamo, type TipoBem } from "./ramos";

export type StatusSinistro =
    | "aberto" | "em_analise" | "vistoria" | "em_oficina" | "documentacao_pendente"
    | "aprovado" | "negado" | "indenizado" | "encerrado";

export const LABEL_STATUS_SINISTRO: Record<StatusSinistro, string> = {
    aberto: "Aberto",
    em_analise: "Em análise",
    vistoria: "Vistoria",
    em_oficina: "Em oficina",
    documentacao_pendente: "Documentação pendente",
    aprovado: "Aprovado",
    negado: "Negado",
    indenizado: "Indenizado",
    encerrado: "Encerrado",
};

const BASE: StatusSinistro[] = ["aberto", "em_analise", "documentacao_pendente", "aprovado", "negado", "indenizado", "encerrado"];
const AUTO: StatusSinistro[] = ["aberto", "em_analise", "vistoria", "em_oficina", "documentacao_pendente", "aprovado", "negado", "indenizado", "encerrado"];

export function statusDoRamo(ramo: string): StatusSinistro[] {
    return tipoBemDoRamo(ramo) === "auto" ? AUTO : BASE;
}

export function statusValidoParaRamo(status: string, ramo: string): boolean {
    return (statusDoRamo(ramo) as string[]).includes(status);
}

const TIPOS: Record<TipoBem, string[]> = {
    auto: ["Colisão", "Roubo/Furto", "Incêndio", "Alagamento", "Vidros", "Terceiros", "Outro"],
    residencial: ["Incêndio", "Danos elétricos", "Roubo/Furto", "Vendaval", "Danos por água", "Outro"],
    vida: ["Morte", "Invalidez", "Doença grave", "Outro"],
    rc: ["Reclamação de terceiro", "Processo judicial", "Outro"],
    livre: ["Outro"],
};

export function tiposSinistroDoRamo(ramo: string): string[] {
    return TIPOS[tipoBemDoRamo(ramo)];
}
