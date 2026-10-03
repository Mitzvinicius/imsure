'use server'

import { createClient } from "@/utils/supabase/server";
import { validarApoliceForm } from "@/app/lib/seguros/validacao";
import { mensagemErroSeguros } from "@/app/lib/seguros/erros";
import { hojeSaoPaulo } from "@/app/lib/seguros/datas";
import { statusValidoParaRamo } from "@/app/lib/seguros/sinistros";
import { nomeSeguroParaStorage } from "@/app/lib/seguros/arquivos";
import { LABEL_STATUS_NEGOCIO, type StatusNegocio } from "@/app/lib/seguros/etapas";
import type { AnexoApolice, ApoliceForm, CoberturaForm, ParcelaForm, TipoEndosso } from "@/app/lib/seguros/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const BUCKET_ANEXOS_APOLICE = "apolice-anexos";
const TAMANHO_MAXIMO_ANEXO = 20 * 1024 * 1024;

function nomeUsuario(user: { email?: string; user_metadata?: Record<string, unknown> }) {
    return (user.user_metadata?.nome as string | undefined) ?? user.email ?? "Você";
}

function erroContato(error: { code?: string; message: string }) {
    if (error.code === "23505") return "Já existe um contato com esse CPF/CNPJ cadastrado nessa corretora.";
    return error.message;
}

async function resolverContato(supabase: Supabase, corretoraId: string, dados: ApoliceForm): Promise<{ error: string | null; contatoId: string | null; criado?: boolean }> {
    if (dados.contatoId) {
        const { data } = await supabase
            .from("contatos")
            .select("id")
            .eq("id", dados.contatoId)
            .eq("corretora_id", corretoraId)
            .maybeSingle();
        if (!data) return { error: "Contato não encontrado nesta corretora.", contatoId: null };
        return { error: null, contatoId: data.id as string };
    }
    if (!dados.novoContato) return { error: "Informe o cliente.", contatoId: null };
    const { data, error } = await supabase
        .from("contatos")
        .insert({
            corretora_id: corretoraId,
            nome: dados.novoContato.nome,
            email: dados.novoContato.email,
            telefone: dados.novoContato.telefone,
            cpf_cnpj: dados.novoContato.cpfCnpj,
            tipo_pessoa: dados.novoContato.tipoPessoa,
        })
        .select("id")
        .single();
    if (error || !data) return { error: error ? erroContato(error) : "Não foi possível criar o contato", contatoId: null };
    return { error: null, contatoId: data.id as string, criado: true };
}

const TABELA_BEM = { auto: "bens_auto", residencial: "bens_residencial", rc: "bens_rc", vida: "vidas_seguradas" } as const;

async function salvarBem(supabase: Supabase, apoliceId: string, dados: ApoliceForm): Promise<string | null> {
    const bem = dados.bem;
    // Tabelas de outros ramos (se o ramo mudou) são limpas; a do ramo atual é atualizada no lugar,
    // para não quebrar sinistros.bem_auto_id / bem_residencial_id (ON DELETE SET NULL).
    for (const [tipo, tabela] of Object.entries(TABELA_BEM)) {
        if (tipo === bem.tipo && tipo !== "vida") continue;
        const { error } = await supabase.from(tabela).delete().eq("apolice_id", apoliceId);
        if (error) return mensagemErroSeguros(error);
    }
    if (bem.tipo === "livre") return null;
    if (bem.tipo === "vida") {
        for (const vida of bem.itens) {
            const { data: vidaCriada, error } = await supabase
                .from("vidas_seguradas")
                .insert({ apolice_id: apoliceId, nome: vida.nome, cpf: vida.cpf || null, data_nascimento: vida.data_nascimento })
                .select("id")
                .single();
            if (error || !vidaCriada) return error ? mensagemErroSeguros(error) : "Não foi possível salvar a vida segurada";
            if (vida.beneficiarios.length) {
                const { error: erroBenef } = await supabase.from("beneficiarios").insert(
                    vida.beneficiarios.map((b) => ({ vida_segurada_id: vidaCriada.id, nome: b.nome, parentesco: b.parentesco || null, percentual: b.percentual })),
                );
                if (erroBenef) return mensagemErroSeguros(erroBenef);
            }
        }
        return null;
    }

    const tabela = TABELA_BEM[bem.tipo];
    const { data: existentes, error: erroBusca } = await supabase.from(tabela).select("id").eq("apolice_id", apoliceId).order("criado_em");
    if (erroBusca) return mensagemErroSeguros(erroBusca);
    const ids = (existentes ?? []).map((e) => e.id as string);

    const itens: Record<string, unknown>[] = bem.itens;
    for (let i = 0; i < itens.length; i++) {
        const { error } = ids[i]
            ? await supabase.from(tabela).update(itens[i]).eq("id", ids[i])
            : await supabase.from(tabela).insert({ ...itens[i], apolice_id: apoliceId });
        if (error) return mensagemErroSeguros(error);
    }
    const sobrando = ids.slice(itens.length);
    if (sobrando.length) {
        const { error } = await supabase.from(tabela).delete().in("id", sobrando);
        if (error) return mensagemErroSeguros(error);
    }
    return null;
}

async function salvarCoberturasDaApolice(supabase: Supabase, apoliceId: string, coberturas: CoberturaForm[]): Promise<string | null> {
    const { error: erroDelete } = await supabase.from("coberturas").delete().eq("apolice_id", apoliceId).is("endosso_id", null);
    if (erroDelete) return mensagemErroSeguros(erroDelete);
    if (!coberturas.length) return null;
    const { error } = await supabase.from("coberturas").insert(coberturas.map((c) => ({ ...c, apolice_id: apoliceId })));
    return error ? mensagemErroSeguros(error) : null;
}

function linhaApolice(dados: ApoliceForm) {
    return {
        seguradora_id: dados.seguradoraId,
        ramo: dados.ramo,
        numero: dados.numero.trim(),
        inicio_vigencia: dados.inicioVigencia,
        fim_vigencia: dados.fimVigencia,
        premio: dados.premio,
        percentual_comissao: dados.percentualComissao,
        forma_pagamento: dados.formaPagamento,
        descricao_bem: dados.bem.tipo === "livre" ? dados.bem.descricao : null,
    };
}

function linhasParcelas(apoliceId: string, endossoId: string | null, parcelas: ParcelaForm[]) {
    return parcelas.map((p) => ({
        apolice_id: apoliceId,
        endosso_id: endossoId,
        numero: p.numero,
        vencimento: p.vencimento,
        valor: p.valor,
        comissao_esperada: p.comissao_esperada,
        linha_digitavel: p.linha_digitavel,
        pix_copia_cola: p.pix_copia_cola,
    }));
}

async function vendedorDoNegocio(supabase: Supabase, negocioId: string): Promise<string | undefined> {
    const { data } = await supabase.from("negocios").select("vendedor_usuario_id").eq("id", negocioId).maybeSingle();
    return (data?.vendedor_usuario_id as string | undefined) ?? undefined;
}

async function validarReferenciasApolice(supabase: Supabase, corretoraId: string, dados: ApoliceForm): Promise<string | null> {
    if (dados.negocioOrigemId) {
        const { data } = await supabase
            .from("negocios")
            .select("id, etapa:etapas!inner(fluxo:fluxos!inner(corretora_id))")
            .eq("id", dados.negocioOrigemId)
            .eq("etapa.fluxo.corretora_id", corretoraId)
            .maybeSingle();
        if (!data) return "Negócio de origem não encontrado nesta corretora.";
    }
    if (dados.apoliceAnteriorId) {
        const { data } = await supabase.from("apolices").select("id").eq("id", dados.apoliceAnteriorId).eq("corretora_id", corretoraId).maybeSingle();
        if (!data) return "Apólice anterior não encontrada nesta corretora.";
    }
    return null;
}

// Emitir apólice = negócio ganho: status, data de fechamento e etapa de emissão do funil (se houver).
async function marcarNegocioGanho(supabase: Supabase, negocioId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: n } = await supabase
        .from("negocios")
        .select("status, etapa_id, fechado_em, etapa:etapas!inner(nome, fluxo_id)")
        .eq("id", negocioId)
        .maybeSingle();
    if (!n) return;
    const etapaAtual = n.etapa as unknown as { nome: string; fluxo_id: string };
    const { data: emissao } = await supabase
        .from("etapas")
        .select("id, nome")
        .eq("fluxo_id", etapaAtual.fluxo_id)
        .eq("emissao", true)
        .maybeSingle();

    const mudancas: Record<string, unknown> = { status: "ganho", motivo_perda: null, observacao_perda: null };
    if (!n.fechado_em) mudancas.fechado_em = hojeSaoPaulo();
    const mover = emissao && emissao.id !== n.etapa_id;
    if (mover) mudancas.etapa_id = emissao.id;
    const { error } = await supabase.from("negocios").update(mudancas).eq("id", negocioId);
    if (error || !user) return;

    const base = { negocio_id: negocioId, usuario_id: user.id, usuario_nome: nomeUsuario(user) };
    const historico = [];
    if (n.status !== "ganho") {
        historico.push({ ...base, campo: "Status", valor_anterior: LABEL_STATUS_NEGOCIO[n.status as StatusNegocio], valor_novo: LABEL_STATUS_NEGOCIO.ganho });
    }
    if (mover) {
        historico.push({ ...base, campo: "Etapa", valor_anterior: etapaAtual.nome, valor_novo: emissao.nome as string });
    }
    if (historico.length) await supabase.from("negocio_historico").insert(historico);
}

export async function criarApolice({ corretoraId, dados }: { corretoraId: string; dados: ApoliceForm }) {
    const erroValidacao = validarApoliceForm(dados);
    if (erroValidacao) return { error: erroValidacao, apoliceId: null };

    const supabase = await createClient();
    const erroRef = await validarReferenciasApolice(supabase, corretoraId, dados);
    if (erroRef) return { error: erroRef, apoliceId: null };

    const contato = await resolverContato(supabase, corretoraId, dados);
    if (contato.error || !contato.contatoId) return { error: contato.error, apoliceId: null };
    const removerContatoCriado = async () => {
        if (contato.criado) await supabase.from("contatos").delete().eq("id", contato.contatoId!);
    };

    const { data: apolice, error } = await supabase
        .from("apolices")
        .insert({
            ...linhaApolice(dados),
            corretora_id: corretoraId,
            contato_id: contato.contatoId,
            negocio_origem_id: dados.negocioOrigemId,
            apolice_anterior_id: dados.apoliceAnteriorId,
            responsavel_usuario_id: dados.responsavelUsuarioId ?? (dados.negocioOrigemId ? await vendedorDoNegocio(supabase, dados.negocioOrigemId) : undefined),
        })
        .select("id")
        .single();
    if (error || !apolice) {
        await removerContatoCriado();
        return { error: error ? mensagemErroSeguros(error) : "Não foi possível criar a apólice", apoliceId: null };
    }

    const apoliceId = apolice.id as string;
    const desfazer = async (mensagem: string) => {
        await supabase.from("apolices").delete().eq("id", apoliceId);
        await removerContatoCriado();
        return { error: mensagem, apoliceId: null };
    };

    const erroBem = await salvarBem(supabase, apoliceId, dados);
    if (erroBem) return desfazer(erroBem);
    const erroCob = await salvarCoberturasDaApolice(supabase, apoliceId, dados.coberturas);
    if (erroCob) return desfazer(erroCob);
    if (dados.parcelas.length) {
        const { error: erroParc } = await supabase.from("parcelas").insert(linhasParcelas(apoliceId, null, dados.parcelas));
        if (erroParc) return desfazer(mensagemErroSeguros(erroParc));
    }

    if (dados.negocioOrigemId) {
        await marcarNegocioGanho(supabase, dados.negocioOrigemId);
    }
    return { error: null, apoliceId };
}

export async function atualizarApolice({ apoliceId, dados }: { apoliceId: string; dados: ApoliceForm }) {
    const erroValidacao = validarApoliceForm({ ...dados, parcelas: [] });
    if (erroValidacao) return { error: erroValidacao };

    const supabase = await createClient();
    const { data: atual } = await supabase.from("apolices").select("corretora_id").eq("id", apoliceId).maybeSingle();
    if (!atual) return { error: "Apólice não encontrada" };

    const contato = await resolverContato(supabase, atual.corretora_id as string, dados);
    if (contato.error || !contato.contatoId) return { error: contato.error };

    const { error } = await supabase
        .from("apolices")
        .update({
            ...linhaApolice(dados),
            contato_id: contato.contatoId,
            ...(dados.responsavelUsuarioId ? { responsavel_usuario_id: dados.responsavelUsuarioId } : {}),
        })
        .eq("id", apoliceId);
    if (error) return { error: mensagemErroSeguros(error) };

    const erroBem = await salvarBem(supabase, apoliceId, dados);
    if (erroBem) return { error: erroBem };
    const erroCob = await salvarCoberturasDaApolice(supabase, apoliceId, dados.coberturas);
    if (erroCob) return { error: erroCob };
    return { error: null };
}

export async function cancelarApolice({ apoliceId, data }: { apoliceId: string; data: string | null }) {
    const supabase = await createClient();
    const { error } = await supabase.from("apolices").update({ cancelada_em: data }).eq("id", apoliceId);
    return { error: error ? mensagemErroSeguros(error) : null };
}

export async function adicionarParcelas({ apoliceId, endossoId, parcelas }: { apoliceId: string; endossoId: string | null; parcelas: ParcelaForm[] }) {
    if (!parcelas.length) return { error: "Nenhuma parcela informada" };
    if (parcelas.some((p) => !(p.valor > 0) || !p.vencimento)) return { error: "Toda parcela precisa de vencimento e valor maior que zero." };
    const supabase = await createClient();
    const { error } = await supabase.from("parcelas").insert(linhasParcelas(apoliceId, endossoId, parcelas));
    return { error: error ? mensagemErroSeguros(error) : null };
}

export async function atualizarParcela({
    parcelaId,
    dados,
}: {
    parcelaId: string;
    dados: Pick<ParcelaForm, "vencimento" | "valor" | "comissao_esperada" | "linha_digitavel" | "pix_copia_cola">;
}) {
    if (!(dados.valor > 0) || !dados.vencimento) return { error: "Informe vencimento e valor maior que zero." };
    const supabase = await createClient();
    const { error } = await supabase.from("parcelas").update(dados).eq("id", parcelaId);
    return { error: error ? mensagemErroSeguros(error) : null };
}

export async function darBaixaManual({ parcelaId, desfazer }: { parcelaId: string; desfazer: boolean }) {
    const supabase = await createClient();
    const { data: parcela } = await supabase.from("parcelas").select("status, baixa_origem").eq("id", parcelaId).maybeSingle();
    if (!parcela) return { error: "Parcela não encontrada" };
    if (parcela.baixa_origem === "extrato") return { error: "Essa baixa veio do extrato de comissão e não pode ser alterada manualmente." };

    const { error } = await supabase
        .from("parcelas")
        .update(desfazer
            ? { status: "aberta", baixa_origem: null, baixa_em: null }
            : { status: "paga", baixa_origem: "manual", baixa_em: new Date().toISOString() })
        .eq("id", parcelaId);
    return { error: error ? mensagemErroSeguros(error) : null };
}

export async function criarEndosso({
    apoliceId,
    numero,
    tipo,
    dataEmissao,
    descricao,
    valor,
    coberturas,
    parcelas,
}: {
    apoliceId: string;
    numero: string;
    tipo: TipoEndosso;
    dataEmissao: string | null;
    descricao: string | null;
    valor: number | null;
    coberturas: CoberturaForm[];
    parcelas: ParcelaForm[];
}) {
    if (!numero.trim()) return { error: "Informe o número do endosso" };
    if (coberturas.some((c) => !c.nome.trim())) return { error: "Toda cobertura precisa de um nome." };
    if (parcelas.some((p) => !(p.valor > 0) || !p.vencimento)) return { error: "Toda parcela precisa de vencimento e valor maior que zero." };

    const supabase = await createClient();
    const { data: endosso, error } = await supabase
        .from("endossos")
        .insert({ apolice_id: apoliceId, numero: numero.trim(), tipo, data_emissao: dataEmissao, descricao, valor })
        .select("id")
        .single();
    if (error || !endosso) return { error: error ? mensagemErroSeguros(error) : "Não foi possível criar o endosso" };

    const desfazer = async (mensagem: string) => {
        await supabase.from("endossos").delete().eq("id", endosso.id);
        return { error: mensagem };
    };
    if (coberturas.length) {
        const { error: e } = await supabase.from("coberturas").insert(coberturas.map((c) => ({ ...c, apolice_id: apoliceId, endosso_id: endosso.id })));
        if (e) return desfazer(mensagemErroSeguros(e));
    }
    if (parcelas.length) {
        const { error: e } = await supabase.from("parcelas").insert(linhasParcelas(apoliceId, endosso.id as string, parcelas));
        if (e) return desfazer(mensagemErroSeguros(e));
    }
    return { error: null };
}

export async function listarAnexosApolice({ apoliceId, sinistroId = null }: { apoliceId: string; sinistroId?: string | null }) {
    const supabase = await createClient();
    let query = supabase
        .from("apolice_anexos")
        .select("id, nome_arquivo, tamanho_bytes, tipo_mime, usuario_nome, criado_em, caminho_storage, endosso_id, parcela_id, sinistro_id, sinistro_andamento_id")
        .eq("apolice_id", apoliceId)
        .order("criado_em", { ascending: false });
    if (sinistroId) query = query.eq("sinistro_id", sinistroId);

    const { data, error } = await query;
    if (error) return { error: error.message, anexos: [] as AnexoApolice[] };

    const anexos = await Promise.all(
        (data ?? []).map(async ({ caminho_storage, ...anexo }) => {
            const { data: signed } = await supabase.storage.from(BUCKET_ANEXOS_APOLICE).createSignedUrl(caminho_storage as string, 300);
            return { ...anexo, url: signed?.signedUrl ?? null } as AnexoApolice;
        }),
    );
    return { error: null, anexos };
}

export async function uploadAnexoApolice(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Usuario não encontrado" };

    const apoliceId = formData.get("apoliceId");
    const arquivo = formData.get("arquivo");
    if (typeof apoliceId !== "string" || !(arquivo instanceof File)) return { error: "Arquivo inválido" };
    if (arquivo.size > TAMANHO_MAXIMO_ANEXO) return { error: "Arquivo maior que 20MB" };

    const opcional = (campo: string) => {
        const v = formData.get(campo);
        return typeof v === "string" && v ? v : null;
    };

    const endossoId = opcional("endossoId");
    const parcelaId = opcional("parcelaId");
    const sinistroId = opcional("sinistroId");
    const andamentoId = opcional("andamentoId");
    const pertence = async (tabela: string, id: string | null) => {
        if (!id) return true;
        const { data } = await supabase.from(tabela).select("id").eq("id", id).eq("apolice_id", apoliceId).maybeSingle();
        return !!data;
    };
    if (!(await pertence("endossos", endossoId)) || !(await pertence("parcelas", parcelaId)) || !(await pertence("sinistros", sinistroId))) {
        return { error: "Registro não pertence a esta apólice" };
    }
    if (andamentoId) {
        const { data } = await supabase.from("sinistro_andamentos").select("id, sinistro:sinistros!inner(apolice_id)").eq("id", andamentoId).eq("sinistro.apolice_id", apoliceId).maybeSingle();
        if (!data) return { error: "Registro não pertence a esta apólice" };
    }

    const caminho = `${apoliceId}/${Date.now()}-${nomeSeguroParaStorage(arquivo.name)}`;
    const { error: erroUpload } = await supabase.storage.from(BUCKET_ANEXOS_APOLICE).upload(caminho, arquivo);
    if (erroUpload) return { error: erroUpload.message };

    const { error: erroInsert } = await supabase.from("apolice_anexos").insert({
        apolice_id: apoliceId,
        endosso_id: endossoId,
        parcela_id: parcelaId,
        sinistro_id: sinistroId,
        sinistro_andamento_id: andamentoId,
        usuario_id: user.id,
        usuario_nome: nomeUsuario(user),
        nome_arquivo: arquivo.name,
        caminho_storage: caminho,
        tamanho_bytes: arquivo.size,
        tipo_mime: arquivo.type || null,
    });
    if (erroInsert) {
        await supabase.storage.from(BUCKET_ANEXOS_APOLICE).remove([caminho]);
        return { error: mensagemErroSeguros(erroInsert) };
    }
    return { error: null };
}

export async function deletarAnexoApolice({ anexoId }: { anexoId: string }) {
    const supabase = await createClient();
    const { data: anexo, error: erroBusca } = await supabase.from("apolice_anexos").select("caminho_storage").eq("id", anexoId).single();
    if (erroBusca || !anexo) return { error: erroBusca?.message ?? "Anexo não encontrado" };

    const { error: erroStorage } = await supabase.storage.from(BUCKET_ANEXOS_APOLICE).remove([anexo.caminho_storage as string]);
    if (erroStorage) return { error: erroStorage.message };

    const { error } = await supabase.from("apolice_anexos").delete().eq("id", anexoId);
    return { error: error ? mensagemErroSeguros(error) : null };
}

export async function criarSinistro({
    apoliceId,
    bemAutoId,
    bemResidencialId,
    dataOcorrencia,
    tipo,
    descricao,
    numeroSeguradora,
}: {
    apoliceId: string;
    bemAutoId: string | null;
    bemResidencialId: string | null;
    dataOcorrencia: string;
    tipo: string;
    descricao: string | null;
    numeroSeguradora: string | null;
}) {
    if (!dataOcorrencia) return { error: "Informe a data da ocorrência", sinistroId: null };
    if (!tipo) return { error: "Informe o tipo do sinistro", sinistroId: null };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Usuario não encontrado", sinistroId: null };

    for (const [tabela, id] of [["bens_auto", bemAutoId], ["bens_residencial", bemResidencialId]] as const) {
        if (!id) continue;
        const { data } = await supabase.from(tabela).select("id").eq("id", id).eq("apolice_id", apoliceId).maybeSingle();
        if (!data) return { error: "Bem segurado não pertence a esta apólice", sinistroId: null };
    }

    const { data: sinistro, error } = await supabase
        .from("sinistros")
        .insert({
            apolice_id: apoliceId,
            bem_auto_id: bemAutoId,
            bem_residencial_id: bemResidencialId,
            data_ocorrencia: dataOcorrencia,
            tipo,
            descricao,
            numero_seguradora: numeroSeguradora,
            status: "aberto",
        })
        .select("id")
        .single();
    if (error || !sinistro) return { error: error ? mensagemErroSeguros(error) : "Não foi possível abrir o sinistro", sinistroId: null };

    const { error: erroAndamento } = await supabase.from("sinistro_andamentos").insert({
        sinistro_id: sinistro.id,
        descricao: "Sinistro aberto",
        status_novo: "aberto",
        usuario_id: user.id,
        usuario_nome: nomeUsuario(user),
    });
    if (erroAndamento) {
        await supabase.from("sinistros").delete().eq("id", sinistro.id);
        return { error: mensagemErroSeguros(erroAndamento), sinistroId: null };
    }
    return { error: null, sinistroId: sinistro.id as string };
}

export async function atualizarSinistro({
    sinistroId,
    descricao,
    numeroSeguradora,
    valorIndenizacao,
}: {
    sinistroId: string;
    descricao: string | null;
    numeroSeguradora: string | null;
    valorIndenizacao: number | null;
}) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("sinistros")
        .update({ descricao, numero_seguradora: numeroSeguradora, valor_indenizacao: valorIndenizacao })
        .eq("id", sinistroId);
    return { error: error ? mensagemErroSeguros(error) : null };
}

export async function registrarAndamento({
    sinistroId,
    descricao,
    statusNovo,
    numeroProcesso,
}: {
    sinistroId: string;
    descricao: string;
    statusNovo: string | null;
    numeroProcesso: string | null;
}) {
    if (!descricao.trim()) return { error: "Descreva o andamento", andamentoId: null };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Usuario não encontrado", andamentoId: null };

    const { data: sinistro } = await supabase
        .from("sinistros")
        .select("status, apolice:apolices(ramo)")
        .eq("id", sinistroId)
        .maybeSingle();
    if (!sinistro) return { error: "Sinistro não encontrado", andamentoId: null };

    const ramo = (sinistro.apolice as unknown as { ramo: string }).ramo;
    const mudouStatus = statusNovo && statusNovo !== sinistro.status;
    if (mudouStatus && !statusValidoParaRamo(statusNovo, ramo)) {
        return { error: "Esse status não se aplica a sinistros desse ramo", andamentoId: null };
    }

    const { data: andamento, error } = await supabase
        .from("sinistro_andamentos")
        .insert({
            sinistro_id: sinistroId,
            descricao: descricao.trim(),
            status_novo: mudouStatus ? statusNovo : null,
            numero_processo: numeroProcesso || null,
            usuario_id: user.id,
            usuario_nome: nomeUsuario(user),
        })
        .select("id")
        .single();
    if (error || !andamento) return { error: error ? mensagemErroSeguros(error) : "Não foi possível registrar o andamento", andamentoId: null };

    if (mudouStatus) {
        const { error: erroStatus } = await supabase.from("sinistros").update({ status: statusNovo }).eq("id", sinistroId);
        if (erroStatus) {
            await supabase.from("sinistro_andamentos").delete().eq("id", andamento.id);
            return { error: mensagemErroSeguros(erroStatus), andamentoId: null };
        }
    }
    return { error: null, andamentoId: andamento.id as string };
}

export async function atualizarConfiguracoesCorretora({
    corretoraId,
    diasAntecedencia,
    etapaRenovacaoId,
    etapaEmissaoId,
}: {
    corretoraId: string;
    diasAntecedencia: number;
    etapaRenovacaoId: string | null;
    etapaEmissaoId: string | null;
}) {
    if (!Number.isInteger(diasAntecedencia) || diasAntecedencia < 1 || diasAntecedencia > 365) {
        return { error: "Informe entre 1 e 365 dias" };
    }
    const supabase = await createClient();
    const { error } = await supabase.from("corretoras").update({ dias_antecedencia_renovacao: diasAntecedencia }).eq("id", corretoraId);
    if (error) return { error: mensagemErroSeguros(error) };

    const { data: fluxos } = await supabase.from("fluxos").select("id").eq("corretora_id", corretoraId);
    const fluxoIds = (fluxos ?? []).map((f) => f.id as string);
    if (fluxoIds.length) {
        const { error: erroLimpar } = await supabase.from("etapas").update({ renovacao: false }).in("fluxo_id", fluxoIds).eq("renovacao", true);
        if (erroLimpar) return { error: mensagemErroSeguros(erroLimpar) };
        const { error: erroLimparEmissao } = await supabase.from("etapas").update({ emissao: false }).in("fluxo_id", fluxoIds).eq("emissao", true);
        if (erroLimparEmissao) return { error: mensagemErroSeguros(erroLimparEmissao) };
    }
    if (etapaEmissaoId) {
        const { error: erroEmissao } = await supabase.from("etapas").update({ emissao: true }).eq("id", etapaEmissaoId).in("fluxo_id", fluxoIds);
        if (erroEmissao) return { error: mensagemErroSeguros(erroEmissao) };
    }
    if (etapaRenovacaoId) {
        const { error: erroMarcar } = await supabase.from("etapas").update({ renovacao: true }).eq("id", etapaRenovacaoId).in("fluxo_id", fluxoIds);
        if (erroMarcar) return { error: mensagemErroSeguros(erroMarcar) };
    }
    return { error: null };
}
