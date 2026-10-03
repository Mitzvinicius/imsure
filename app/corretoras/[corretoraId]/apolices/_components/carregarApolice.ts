import type { createClient } from "@/utils/supabase/server";
import { tipoBemDoRamo } from "@/app/lib/seguros/ramos";
import type { ApoliceForm, BemSeguradoForm, ContatoResumo, FormaPagamento } from "@/app/lib/seguros/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export function formVazio(): ApoliceForm {
    return {
        contatoId: null, novoContato: null, seguradoraId: "", ramo: "", numero: "",
        inicioVigencia: "", fimVigencia: "", premio: null, percentualComissao: null,
        formaPagamento: "boleto", negocioOrigemId: null, apoliceAnteriorId: null, responsavelUsuarioId: null,
        bem: { tipo: "livre", descricao: "" }, coberturas: [], parcelas: [],
    };
}

export async function carregarApoliceForm(supabase: Supabase, apoliceId: string): Promise<{ form: ApoliceForm; contato: ContatoResumo; corretoraId: string } | null> {
    const { data: a } = await supabase
        .from("apolices")
        .select("*, contato:contatos(id, nome, cpf_cnpj)")
        .eq("id", apoliceId)
        .maybeSingle();
    if (!a) return null;

    const ramo = a.ramo as string;
    const tipo = tipoBemDoRamo(ramo);
    let bem: BemSeguradoForm = { tipo: "livre", descricao: (a.descricao_bem as string | null) ?? "" };

    if (tipo === "auto") {
        const { data } = await supabase.from("bens_auto").select("*").eq("apolice_id", apoliceId);
        bem = {
            tipo: "auto",
            itens: (data ?? []).map((b) => ({
                placa: b.placa ?? "", chassi: b.chassi ?? "", marca: b.marca ?? "", modelo: b.modelo ?? "",
                ano_fabricacao: b.ano_fabricacao ?? null, ano_modelo: b.ano_modelo ?? null, cep_pernoite: b.cep_pernoite ?? "",
            })),
        };
    } else if (tipo === "residencial") {
        const { data } = await supabase.from("bens_residencial").select("*").eq("apolice_id", apoliceId);
        bem = {
            tipo: "residencial",
            itens: (data ?? []).map((b) => ({
                cep: b.cep ?? "", logradouro: b.logradouro ?? "", numero: b.numero ?? "", complemento: b.complemento ?? "",
                bairro: b.bairro ?? "", cidade: b.cidade ?? "", uf: b.uf ?? "", tipo_imovel: b.tipo_imovel ?? "casa",
            })),
        };
    } else if (tipo === "rc") {
        const { data } = await supabase.from("bens_rc").select("atividade, limite").eq("apolice_id", apoliceId);
        bem = { tipo: "rc", itens: (data ?? []).map((b) => ({ atividade: b.atividade as string, limite: b.limite as number | null })) };
    } else if (tipo === "vida") {
        const { data } = await supabase.from("vidas_seguradas").select("nome, cpf, data_nascimento, beneficiarios(nome, parentesco, percentual)").eq("apolice_id", apoliceId);
        bem = {
            tipo: "vida",
            itens: (data ?? []).map((v) => ({
                nome: v.nome as string,
                cpf: (v.cpf as string | null) ?? "",
                data_nascimento: v.data_nascimento as string | null,
                beneficiarios: ((v.beneficiarios ?? []) as { nome: string; parentesco: string | null; percentual: number }[])
                    .map((b) => ({ nome: b.nome, parentesco: b.parentesco ?? "", percentual: Number(b.percentual) })),
            })),
        };
    }

    const { data: coberturas } = await supabase
        .from("coberturas")
        .select("nome, importancia_segurada, franquia")
        .eq("apolice_id", apoliceId)
        .is("endosso_id", null)
        .order("criado_em");

    const contato = a.contato as ContatoResumo;
    return {
        corretoraId: a.corretora_id as string,
        contato,
        form: {
            contatoId: contato.id,
            novoContato: null,
            seguradoraId: a.seguradora_id as string,
            ramo,
            numero: a.numero as string,
            inicioVigencia: a.inicio_vigencia as string,
            fimVigencia: a.fim_vigencia as string,
            premio: a.premio as number | null,
            percentualComissao: a.percentual_comissao as number | null,
            formaPagamento: a.forma_pagamento as FormaPagamento,
            negocioOrigemId: a.negocio_origem_id as string | null,
            apoliceAnteriorId: a.apolice_anterior_id as string | null,
            responsavelUsuarioId: a.responsavel_usuario_id as string | null,
            bem,
            coberturas: (coberturas ?? []).map((c) => ({ nome: c.nome as string, importancia_segurada: c.importancia_segurada as number | null, franquia: c.franquia as number | null })),
            parcelas: [],
        },
    };
}
