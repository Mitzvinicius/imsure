export const PERMISSOES = [
    { chave: "negocios.excluir", grupo: "Negócios", descricao: "Excluir negócios" },
    { chave: "apolices.excluir", grupo: "Apólices", descricao: "Excluir apólices" },
    { chave: "sinistros.excluir", grupo: "Sinistros", descricao: "Excluir sinistros" },
    { chave: "carteira.transferir", grupo: "Carteira", descricao: "Trocar responsável e transferir carteira" },
    { chave: "parcelas.baixa", grupo: "Financeiro", descricao: "Dar baixa em parcelas" },
    { chave: "contatos.financeiro.ver", grupo: "Contatos", descricao: "Ver dados financeiros e patrimônio do cliente" },
    { chave: "contatos.saude.ver", grupo: "Contatos", descricao: "Ver dados de saúde do cliente" },
    { chave: "equipe.membros", grupo: "Equipe", descricao: "Convidar, trocar cargo e desativar membros" },
    { chave: "equipe.equipes", grupo: "Equipe", descricao: "Gerenciar equipes e líderes" },
    { chave: "configuracoes.editar", grupo: "Corretora", descricao: "Editar configurações e funis da corretora" },
    { chave: "plano.gerenciar", grupo: "Conta", descricao: "Gerenciar plano e cobrança da conta" },
] as const;

export type Permissao = (typeof PERMISSOES)[number]["chave"];
export type ChaveCargo = "administrador" | "gerente" | "financeiro" | "operacional" | "produtor";
export type Escopo = "tudo" | "equipe" | "propria";

export const LABEL_ESCOPO: Record<Escopo, string> = {
    tudo: "Vê tudo da corretora",
    equipe: "Vê a carteira da equipe",
    propria: "Vê a própria carteira (e a da equipe, se for líder)",
};

const TODAS = PERMISSOES.map((p) => p.chave) as Permissao[];

// Fonte de verdade em TS; o seed SQL (Task 2) replica exatamente esta tabela.
export const CARGOS_PADRAO: Record<ChaveCargo, { nome: string; escopo: Escopo; permissoes: Permissao[] }> = {
    administrador: { nome: "Administrador", escopo: "tudo", permissoes: TODAS },
    gerente: {
        nome: "Gerente",
        escopo: "tudo",
        permissoes: ["negocios.excluir", "apolices.excluir", "sinistros.excluir", "carteira.transferir", "parcelas.baixa", "contatos.financeiro.ver", "equipe.equipes"],
    },
    financeiro: {
        nome: "Financeiro",
        escopo: "tudo",
        permissoes: ["parcelas.baixa", "contatos.financeiro.ver", "configuracoes.editar", "plano.gerenciar"],
    },
    operacional: {
        nome: "Operacional",
        escopo: "tudo",
        permissoes: ["parcelas.baixa", "contatos.financeiro.ver", "contatos.saude.ver"],
    },
    produtor: {
        nome: "Produtor",
        escopo: "propria",
        permissoes: ["contatos.financeiro.ver", "contatos.saude.ver"],
    },
};

export function textoUsoPlano({ usados, limite, plano }: { usados: number; limite: number; plano: string }): string {
    return `${usados} de ${limite} usuários do plano ${plano}`;
}

export function linkConvite(origin: string, token: string): string {
    return `${origin}/convite/${token}`;
}

export function mensagemWhatsappConvite({ corretora, cargo, link }: { corretora: string; cargo: string; link: string }): string {
    return `Olá! Você foi convidado(a) para a equipe da ${corretora} no imsure como ${cargo}. Acesse: ${link} (o link vale por 7 dias)`;
}

// Usado no ?next= do login: só caminhos internos, para não virar redirecionamento aberto.
export function caminhoSeguro(next: string | null | undefined): string {
    if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/contas";
    return next;
}
