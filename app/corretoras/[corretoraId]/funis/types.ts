export type Etapa = {
    id: string;
    nome: string;
    ordem: number;
};

export type Fluxo = {
    id: string;
    nome: string;
    ativo: boolean;
};

export type Negocio = {
    id: string;
    etapa_id: string;
    tipo: string;
    ramo: string;
    seguradora: string | null;
    origem: string | null;
    grupo_producao: string | null;
    valor: number | null;
    indicacao: boolean;
    criado_em: string;
    fechado_em: string | null;
    contato: {
        id: string;
        nome: string;
        telefone: string | null;
        email: string | null;
        cpf_cnpj: string | null;
        tipo_pessoa: "fisica" | "juridica";
        profissoes: string[] | null;
    };
    vendedor: {
        id: string;
        nome: string;
    };
};

export type Anotacao = {
    id: string;
    texto: string;
    usuario_nome: string;
    criado_em: string;
};

export type HistoricoEntry = {
    id: string;
    campo: string;
    valor_anterior: string | null;
    valor_novo: string | null;
    usuario_nome: string;
    criado_em: string;
};

export type Anexo = {
    id: string;
    nome_arquivo: string;
    tamanho_bytes: number | null;
    tipo_mime: string | null;
    usuario_nome: string;
    criado_em: string;
    url: string | null;
};

export type ContatoBusca = {
    id: string;
    nome: string;
    telefone: string | null;
    email: string | null;
    cpf_cnpj: string | null;
    tipo_pessoa: "fisica" | "juridica";
};
