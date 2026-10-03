import { tipoBemDoRamo } from "@/app/lib/seguros/ramos";
import type { StatusApolice } from "@/app/lib/seguros/status";

export type TipoBemPatrimonio = "imovel" | "veiculo" | "outro";

export const LABEL_TIPO_BEM: Record<TipoBemPatrimonio, string> = {
    imovel: "Imóvel",
    veiculo: "Veículo",
    outro: "Outro",
};

// Só ramos que seguram bens podem ser ligados a um item do patrimônio.
export function ramoPodeVincularBem(ramo: string): boolean {
    const tipo = tipoBemDoRamo(ramo);
    return tipo === "auto" || tipo === "residencial" || ramo === "Empresarial";
}

export type SituacaoSeguroBem = "segurado" | "seguro_vencido" | "sem_seguro";

export function situacaoSeguroBem(statusDasApolices: StatusApolice[]): SituacaoSeguroBem {
    if (!statusDasApolices.length) return "sem_seguro";
    return statusDasApolices.includes("vigente") ? "segurado" : "seguro_vencido";
}

export function totalPatrimonio(bens: { valor_estimado: number | null }[]): number {
    return Math.round(bens.reduce((acc, b) => acc + (b.valor_estimado ?? 0) * 100, 0)) / 100;
}
