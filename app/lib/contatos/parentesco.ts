import { telefoneCompleto, validarEmail } from "@/app/corretoras/[corretoraId]/funis/masks";

export const PARENTESCOS = [
    "conjuge", "pai_mae", "filho", "irmao", "avo", "neto",
    "sogro", "genro_nora", "cunhado", "enteado", "padrasto_madrasta",
] as const;
export type Parentesco = (typeof PARENTESCOS)[number];

export const LABEL_PARENTESCO: Record<Parentesco, string> = {
    conjuge: "Cônjuge",
    pai_mae: "Pai/Mãe",
    filho: "Filho(a)",
    irmao: "Irmão(ã)",
    avo: "Avô/Avó",
    neto: "Neto(a)",
    sogro: "Sogro(a)",
    genro_nora: "Genro/Nora",
    cunhado: "Cunhado(a)",
    enteado: "Enteado(a)",
    padrasto_madrasta: "Padrasto/Madrasta",
};

const INVERSO: Record<Parentesco, Parentesco> = {
    conjuge: "conjuge",
    pai_mae: "filho",
    filho: "pai_mae",
    irmao: "irmao",
    avo: "neto",
    neto: "avo",
    sogro: "genro_nora",
    genro_nora: "sogro",
    cunhado: "cunhado",
    enteado: "padrasto_madrasta",
    padrasto_madrasta: "enteado",
};

// O vínculo é gravado uma vez ("B é <parentesco> de A"); no registro de B ele aparece invertido.
export function parentescoInverso(p: Parentesco): Parentesco {
    return INVERSO[p];
}

export const LABEL_ESTADO_CIVIL = {
    solteiro: "Solteiro(a)",
    casado: "Casado(a)",
    uniao_estavel: "União estável",
    divorciado: "Divorciado(a)",
    separado: "Separado(a)",
    viuvo: "Viúvo(a)",
} as const;
export type EstadoCivil = keyof typeof LABEL_ESTADO_CIVIL;

export function validarNovoParente({ nome, telefone, email }: { nome: string; telefone: string; email: string }): string | null {
    if (!nome.trim()) return "Informe o nome do parente.";
    if (!telefone && !email.trim()) return "Informe telefone ou e-mail do parente.";
    if (telefone && !telefoneCompleto(telefone)) return "Telefone incompleto.";
    if (email.trim() && !validarEmail(email.trim())) return "E-mail inválido.";
    return null;
}

export type PessoaVinculo = { id: string; nome: string; telefone: string | null; email: string | null };
export type VinculoBanco = { id: string; parentesco: Parentesco; contato: PessoaVinculo; parente: PessoaVinculo };
export type ParenteDoContato = { vinculoId: string; parentesco: Parentesco; pessoa: PessoaVinculo };

// Junta os vínculos onde o contato aparece de qualquer lado, já com o grau visto a partir dele.
export function parentesDoContato(contatoId: string, vinculos: VinculoBanco[]): ParenteDoContato[] {
    return vinculos
        .filter((v) => v.contato.id === contatoId || v.parente.id === contatoId)
        .map((v) =>
            v.contato.id === contatoId
                ? { vinculoId: v.id, parentesco: v.parentesco, pessoa: v.parente }
                : { vinculoId: v.id, parentesco: parentescoInverso(v.parentesco), pessoa: v.contato },
        )
        .sort((a, b) => PARENTESCOS.indexOf(a.parentesco) - PARENTESCOS.indexOf(b.parentesco) || a.pessoa.nome.localeCompare(b.pessoa.nome));
}
