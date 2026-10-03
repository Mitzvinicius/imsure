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

export function formatCpf(input: string): string {
    return formatCpfCnpj(apenasDigitos(input).slice(0, 11)).formatted;
}

function agruparMilhar(inteiro: string): string {
    return inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function centavosParaTexto(centavos: number): string {
    const negativo = centavos < 0;
    const abs = Math.abs(centavos);
    const inteiro = agruparMilhar(String(Math.floor(abs / 100)));
    const decimais = String(abs % 100).padStart(2, "0");
    return `${negativo ? "-" : ""}${inteiro},${decimais}`;
}

// Máscara de digitação "da direita para a esquerda": cada dígito digitado entra nos centavos.
export function mascaraMoeda(texto: string, permitirNegativo = false): { texto: string; valor: number | null } {
    const digitos = apenasDigitos(texto).replace(/^0+/, "").slice(0, 12);
    const centavos = Number(digitos || "0");
    if (centavos === 0) return { texto: "", valor: null };
    const sinal = permitirNegativo && texto.includes("-") ? -1 : 1;
    return { texto: centavosParaTexto(sinal * centavos), valor: (sinal * centavos) / 100 };
}

export function formatMoeda(valor: number | null): string {
    if (valor == null) return "";
    return centavosParaTexto(Math.round(valor * 100));
}

export function mascaraPercentual(texto: string): { texto: string; valor: number | null } {
    const digitos = apenasDigitos(texto).replace(/^0+/, "").slice(0, 5);
    const centesimos = Math.min(Number(digitos || "0"), 10000);
    if (centesimos === 0) return { texto: "", valor: null };
    return { texto: centavosParaTexto(centesimos), valor: centesimos / 100 };
}

export function formatPercentual(valor: number | null): string {
    if (valor == null) return "";
    return centavosParaTexto(Math.round(valor * 100));
}

// Decimal genérico "da direita para a esquerda" (peso, altura...): `casas` decimais, até `maxDigitos` dígitos.
export function mascaraDecimal(texto: string, casas: number, maxDigitos: number): { texto: string; valor: number | null } {
    const digitos = apenasDigitos(texto).replace(/^0+/, "").slice(0, maxDigitos);
    const n = Number(digitos || "0");
    if (n === 0) return { texto: "", valor: null };
    const valor = n / 10 ** casas;
    return { texto: formatDecimal(valor, casas), valor };
}

export function formatDecimal(valor: number | null, casas: number): string {
    if (valor == null) return "";
    return valor.toFixed(casas).replace(".", ",");
}
