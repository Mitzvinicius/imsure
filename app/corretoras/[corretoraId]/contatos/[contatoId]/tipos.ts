import type { EstadoCivil } from "@/app/lib/contatos/parentesco";
import type { TipoBemPatrimonio } from "@/app/lib/contatos/patrimonio";
import type { StatusApolice } from "@/app/lib/seguros/status";

export type ContatoFicha = {
    id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    cpfCnpj: string | null;
    tipoPessoa: "fisica" | "juridica";
    dataNascimento: string | null;
    estadoCivil: EstadoCivil | null;
    rendaMensal: number | null;
    patrimonioFinanceiro: number | null;
};

export type ApoliceResumo = { id: string; numero: string; ramo: string; seguradora: string; status: StatusApolice };

export type BemComApolices = {
    id: string;
    tipo: TipoBemPatrimonio;
    descricao: string;
    valor_estimado: number | null;
    placa: string | null;
    endereco: string | null;
    apolices: ApoliceResumo[];
};

export type Saude = { pesoKg: number | null; alturaM: number | null; atualizadoEm: string | null };
