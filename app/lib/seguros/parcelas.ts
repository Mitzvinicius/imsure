import { somarMeses } from "./datas";

export type ParcelaGerada = { numero: number; vencimento: string; valor: number };

export function gerarParcelas({
    total,
    quantidade,
    primeiroVencimento,
}: {
    total: number;
    quantidade: number;
    primeiroVencimento: string;
}): ParcelaGerada[] {
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 48) {
        throw new RangeError("Quantidade de parcelas deve ser entre 1 e 48");
    }
    if (!(total > 0)) {
        throw new RangeError("Valor total deve ser maior que zero");
    }
    const totalCentavos = Math.round(total * 100);
    const base = Math.floor(totalCentavos / quantidade);
    const ultima = totalCentavos - base * (quantidade - 1);

    return Array.from({ length: quantidade }, (_, i) => ({
        numero: i + 1,
        vencimento: somarMeses(primeiroVencimento, i),
        valor: (i === quantidade - 1 ? ultima : base) / 100,
    }));
}

export function diferencaCentavos(premio: number | null, valores: number[]): number {
    if (premio == null) return 0;
    const soma = valores.reduce((acc, v) => acc + Math.round(v * 100), 0);
    return soma - Math.round(premio * 100);
}
