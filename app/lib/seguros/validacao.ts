import type { ApoliceForm } from "./types";

export function validarPercentuaisBeneficiarios(percentuais: number[]): string | null {
    if (percentuais.length === 0) return null;
    if (percentuais.some((p) => !(p > 0))) return "Percentual de beneficiário deve ser maior que zero.";
    const somaCentesimos = percentuais.reduce((acc, p) => acc + Math.round(p * 100), 0);
    if (somaCentesimos !== 10000) return "Os percentuais dos beneficiários precisam somar 100%.";
    return null;
}

export function validarApoliceForm(f: ApoliceForm): string | null {
    if (!f.contatoId && !f.novoContato?.nome.trim()) return "Informe o cliente.";
    if (!f.seguradoraId) return "Informe a seguradora.";
    if (!f.ramo) return "Informe o ramo.";
    if (!f.numero.trim()) return "Informe o número da apólice.";
    if (!f.inicioVigencia || !f.fimVigencia) return "Informe o início e o fim da vigência.";
    if (f.fimVigencia <= f.inicioVigencia) return "O fim da vigência precisa ser depois do início.";

    if (f.coberturas.some((c) => !c.nome.trim())) return "Toda cobertura precisa de um nome.";

    const numeros = f.parcelas.map((p) => p.numero);
    if (new Set(numeros).size !== numeros.length) return "Há parcelas com número repetido.";
    if (f.parcelas.some((p) => !(p.valor > 0))) return "Toda parcela precisa ter valor maior que zero.";
    if (f.parcelas.some((p) => !p.vencimento)) return "Toda parcela precisa de vencimento.";

    if (f.bem.tipo === "vida") {
        for (const vida of f.bem.itens) {
            if (!vida.nome.trim()) return "Toda vida segurada precisa de um nome.";
            const erro = validarPercentuaisBeneficiarios(vida.beneficiarios.map((b) => b.percentual));
            if (erro) return `${vida.nome}: ${erro}`;
        }
    }
    if (f.bem.tipo === "rc" && f.bem.itens.some((i) => !i.atividade.trim())) return "Informe a atividade coberta.";
    return null;
}
