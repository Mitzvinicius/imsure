export function hojeSaoPaulo(agora: Date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(agora);
}

export function somarMeses(dataIso: string, meses: number): string {
    const [ano, mes, dia] = dataIso.slice(0, 10).split("-").map(Number);
    const alvo = new Date(Date.UTC(ano, mes - 1 + meses, 1));
    const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
    alvo.setUTCDate(Math.min(dia, ultimoDia));
    return alvo.toISOString().slice(0, 10);
}

export function parseValorBR(s: string): number | null {
    const limpo = s.replace(/[^\d,]/g, "").replace(",", ".");
    if (!limpo) return null;
    const n = parseFloat(limpo);
    return Number.isNaN(n) ? null : n;
}

export function formatData(dataIso: string | null): string {
    if (!dataIso) return "—";
    const [ano, mes, dia] = dataIso.slice(0, 10).split("-");
    return `${dia}/${mes}/${ano}`;
}

export function somarDias(dataIso: string, dias: number): string {
    const [ano, mes, dia] = dataIso.slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}
