export type Contact = {
    id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    data_nascimento: string | null;
    genero: string | null;
    situacao: "cliente" | "lead" | "ex-cliente";
};
