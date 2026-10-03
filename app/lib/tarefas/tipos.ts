export type Prioridade = "baixa" | "media" | "alta";
export type StatusTarefa = "a_fazer" | "em_andamento" | "concluida" | "cancelada";
export type TipoVinculo = "negocio" | "apolice" | "sinistro" | "contato";
export type Vinculo = { tipo: TipoVinculo; id: string };
/** Onde um comentário pode estar: um registro ou uma tarefa. */
export type Alvo = { tipo: TipoVinculo | "tarefa"; id: string };
export type Membro = { id: string; nome: string };

export type TarefaLinha = {
    id: string;
    corretora_id: string;
    titulo: string;
    descricao: string | null;
    prioridade: Prioridade;
    status: StatusTarefa;
    prazo: string | null;
    prazo_hora: string | null;
    concluida_em: string | null;
    criado_em: string;
    responsavel: Membro;
    criador: Membro;
    vinculo: Vinculo | null;
    rotuloVinculo: string | null;
};

export type DadosTarefa = {
    titulo: string;
    descricao: string;
    responsavelId: string;
    prazo: string | null;
    prazoHora: string | null;
    prioridade: Prioridade;
    status: StatusTarefa;
};

export type ComentarioLinha = { id: string; texto: string; criado_em: string; editado_em: string | null; autor: Membro };

export type TipoNotificacao = "tarefa_atribuida" | "mencao" | "comentario_tarefa" | "prazo_hoje" | "tarefa_atrasada" | "tarefa_concluida";
export type NotificacaoLinha = {
    id: string;
    tipo: TipoNotificacao;
    titulo: string;
    texto: string | null;
    link: string;
    lida_em: string | null;
    criado_em: string;
};

export type RegistroBusca = { tipo: TipoVinculo; id: string; rotulo: string };
