'use server'

import { createClient } from "@/utils/supabase/server";
import { validarApoliceForm } from "@/app/lib/seguros/validacao";
import { mensagemErroSeguros } from "@/app/lib/seguros/erros";
import { hojeSaoPaulo } from "@/app/lib/seguros/datas";
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

async function resolverContato(supabase: Supabase, corretoraId: string, dados: ApoliceForm): Promise<{ error: string | null; contatoId: string | null }> {
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
    return { error: null, contatoId: data.id as string };
}

async function salvarBem(supabase: Supabase, apoliceId: string, dados: ApoliceForm): Promise<string | null> {
    for (const tabela of ["bens_auto", "bens_residencial", "bens_rc", "vidas_seguradas"]) {
        const { error } = await supabase.from(tabela).delete().eq("apolice_id", apoliceId);
        if (error) return mensagemErroSeguros(error);
    }
    const bem = dados.bem;
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
    const tabela = bem.tipo === "auto" ? "bens_auto" : bem.tipo === "residencial" ? "bens_residencial" : "bens_rc";
    if (!bem.itens.length) return null;
    const { error } = await supabase.from(tabela).insert(bem.itens.map((i) => ({ ...i, apolice_id: apoliceId })));
    return error ? mensagemErroSeguros(error) : null;
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

export async function criarApolice({ corretoraId, dados }: { corretoraId: string; dados: ApoliceForm }) {
    const erroValidacao = validarApoliceForm(dados);
    if (erroValidacao) return { error: erroValidacao, apoliceId: null };

    const supabase = await createClient();
    const contato = await resolverContato(supabase, corretoraId, dados);
    if (contato.error || !contato.contatoId) return { error: contato.error, apoliceId: null };

    const { data: apolice, error } = await supabase
        .from("apolices")
        .insert({
            ...linhaApolice(dados),
            corretora_id: corretoraId,
            contato_id: contato.contatoId,
            negocio_origem_id: dados.negocioOrigemId,
            apolice_anterior_id: dados.apoliceAnteriorId,
        })
        .select("id")
        .single();
    if (error || !apolice) return { error: error ? mensagemErroSeguros(error) : "Não foi possível criar a apólice", apoliceId: null };

    const apoliceId = apolice.id as string;
    const desfazer = async (mensagem: string) => {
        await supabase.from("apolices").delete().eq("id", apoliceId);
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
        await supabase.from("negocios").update({ fechado_em: hojeSaoPaulo() }).eq("id", dados.negocioOrigemId).is("fechado_em", null);
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
        .update({ ...linhaApolice(dados), contato_id: contato.contatoId })
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

    const caminho = `${apoliceId}/${Date.now()}-${arquivo.name}`;
    const { error: erroUpload } = await supabase.storage.from(BUCKET_ANEXOS_APOLICE).upload(caminho, arquivo);
    if (erroUpload) return { error: erroUpload.message };

    const { error: erroInsert } = await supabase.from("apolice_anexos").insert({
        apolice_id: apoliceId,
        endosso_id: opcional("endossoId"),
        parcela_id: opcional("parcelaId"),
        sinistro_id: opcional("sinistroId"),
        sinistro_andamento_id: opcional("andamentoId"),
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
