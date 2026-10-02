import type { StatusApolice } from "./status";
import type { StatusSinistro } from "./sinistros";

export type FormaPagamento = "boleto" | "cartao" | "debito";
export type StatusParcela = "aberta" | "paga" | "comissao_recebida";

export const LABEL_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
    boleto: "Boleto",
    cartao: "Cartão de crédito",
    debito: "Débito em conta",
};

export const LABEL_STATUS_PARCELA: Record<StatusParcela, string> = {
    aberta: "Em aberto",
    paga: "Paga",
    comissao_recebida: "Comissão recebida",
};

export type Seguradora = {
    id: string;
    nome: string;
    telefone_assistencia: string | null;
    telefone_sinistro: string | null;
};

export type NovoContato = {
    nome: string;
    email: string | null;
    telefone: string | null;
    cpfCnpj: string | null;
    tipoPessoa: "fisica" | "juridica";
};

export type ContatoResumo = { id: string; nome: string; cpf_cnpj: string | null };

export type BemAutoForm = {
    placa: string; chassi: string; marca: string; modelo: string;
    ano_fabricacao: number | null; ano_modelo: number | null; cep_pernoite: string;
};
export type BemResidencialForm = {
    cep: string; logradouro: string; numero: string; complemento: string;
    bairro: string; cidade: string; uf: string;
    tipo_imovel: "casa" | "apartamento" | "condominio" | "outro";
};
export type BemRcForm = { atividade: string; limite: number | null };
export type BeneficiarioForm = { nome: string; parentesco: string; percentual: number };
export type VidaSeguradaForm = { nome: string; cpf: string; data_nascimento: string | null; beneficiarios: BeneficiarioForm[] };

export type BemSeguradoForm =
    | { tipo: "auto"; itens: BemAutoForm[] }
    | { tipo: "residencial"; itens: BemResidencialForm[] }
    | { tipo: "rc"; itens: BemRcForm[] }
    | { tipo: "vida"; itens: VidaSeguradaForm[] }
    | { tipo: "livre"; descricao: string };

export type CoberturaForm = { nome: string; importancia_segurada: number | null; franquia: number | null };

export type ParcelaForm = {
    numero: number;
    vencimento: string;
    valor: number;
    comissao_esperada: number | null;
    linha_digitavel: string | null;
    pix_copia_cola: string | null;
};

export type ApoliceForm = {
    contatoId: string | null;
    novoContato: NovoContato | null;
    seguradoraId: string;
    ramo: string;
    numero: string;
    inicioVigencia: string;
    fimVigencia: string;
    premio: number | null;
    percentualComissao: number | null;
    formaPagamento: FormaPagamento;
    negocioOrigemId: string | null;
    apoliceAnteriorId: string | null;
    bem: BemSeguradoForm;
    coberturas: CoberturaForm[];
    parcelas: ParcelaForm[];
};

export type ApoliceLinha = {
    id: string;
    numero: string;
    ramo: string;
    inicio_vigencia: string;
    fim_vigencia: string;
    premio: number | null;
    status: StatusApolice;
    contato_nome: string;
    seguradora_nome: string;
    placas: string[];
    chassis: string[];
    proxima_parcela: string | null;
};

export type Parcela = {
    id: string;
    endosso_id: string | null;
    numero: number;
    vencimento: string;
    valor: number;
    comissao_esperada: number | null;
    status: StatusParcela;
    baixa_origem: "manual" | "extrato" | null;
    baixa_em: string | null;
    linha_digitavel: string | null;
    pix_copia_cola: string | null;
};

export type Endosso = {
    id: string;
    numero: string;
    tipo: TipoEndosso;
    data_emissao: string | null;
    descricao: string | null;
    valor: number | null;
};

export type TipoEndosso = "alteracao_bem" | "inclusao" | "exclusao" | "alteracao_cobertura" | "cancelamento" | "outro";

export const LABEL_TIPO_ENDOSSO: Record<TipoEndosso, string> = {
    alteracao_bem: "Alteração do bem",
    inclusao: "Inclusão",
    exclusao: "Exclusão",
    alteracao_cobertura: "Alteração de cobertura",
    cancelamento: "Cancelamento",
    outro: "Outro",
};

export type Cobertura = CoberturaForm & { id: string; endosso_id: string | null };

export type AnexoApolice = {
    id: string;
    nome_arquivo: string;
    tamanho_bytes: number | null;
    tipo_mime: string | null;
    usuario_nome: string;
    criado_em: string;
    url: string | null;
    endosso_id: string | null;
    parcela_id: string | null;
    sinistro_id: string | null;
    sinistro_andamento_id: string | null;
};

export type SinistroLinha = {
    id: string;
    apolice_id: string;
    apolice_numero: string;
    ramo: string;
    contato_nome: string;
    data_ocorrencia: string;
    tipo: string;
    status: StatusSinistro;
    numero_seguradora: string | null;
};

export type Andamento = {
    id: string;
    data: string;
    descricao: string;
    status_novo: StatusSinistro | null;
    numero_processo: string | null;
    usuario_nome: string;
};
