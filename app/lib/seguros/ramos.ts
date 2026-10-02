export const RAMOS_OPCOES = [
    "Automóvel", "Vida Individual", "Residencial",
    "Resp. Civil Profissional", "Empresarial", "Saúde",
] as const;

export type TipoBem = "auto" | "residencial" | "vida" | "rc" | "livre";

const TIPO_POR_RAMO: Record<string, TipoBem> = {
    "Automóvel": "auto",
    "Residencial": "residencial",
    "Vida Individual": "vida",
    "Resp. Civil Profissional": "rc",
};

export function tipoBemDoRamo(ramo: string): TipoBem {
    return TIPO_POR_RAMO[ramo] ?? "livre";
}
