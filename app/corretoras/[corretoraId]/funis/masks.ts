export function apenasDigitos(s: string): string {
    return s.replace(/\D/g, "");
}

export function formatTelefone(input: string): string {
    const d = apenasDigitos(input).slice(0, 11);
    if (!d) return "";
    const ddd = d.slice(0, 2);
    const isCelular = d.length > 10;
    const meio = isCelular ? d.slice(2, 7) : d.slice(2, 6);
    const fim = isCelular ? d.slice(7, 11) : d.slice(6, 10);

    let out = `(${ddd}`;
    if (ddd.length === 2) out += ") ";
    out += meio;
    if (fim) out += `-${fim}`;
    return out;
}

export function telefoneCompleto(input: string): boolean {
    const d = apenasDigitos(input);
    return d.length === 10 || d.length === 11;
}

export type TipoPessoa = "fisica" | "juridica";

export function formatCpfCnpj(input: string): { formatted: string; tipo: TipoPessoa } {
    const d = apenasDigitos(input).slice(0, 14);

    if (d.length <= 11) {
        let out = d.slice(0, 3);
        if (d.length > 3) out += `.${d.slice(3, 6)}`;
        if (d.length > 6) out += `.${d.slice(6, 9)}`;
        if (d.length > 9) out += `-${d.slice(9, 11)}`;
        return { formatted: out, tipo: "fisica" };
    }

    let out = d.slice(0, 2);
    out += `.${d.slice(2, 5)}`;
    if (d.length > 5) out += `.${d.slice(5, 8)}`;
    if (d.length > 8) out += `/${d.slice(8, 12)}`;
    if (d.length > 12) out += `-${d.slice(12, 14)}`;
    return { formatted: out, tipo: "juridica" };
}

export function cpfCnpjCompleto(input: string): boolean {
    const d = apenasDigitos(input);
    return d.length === 11 || d.length === 14;
}

export function validarEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
