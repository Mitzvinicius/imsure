import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { calcularStatusApolice } from "@/app/lib/seguros/status";
import { hojeSaoPaulo } from "@/app/lib/seguros/datas";
import type { Cobertura, Endosso, Parcela, SinistroLinha } from "@/app/lib/seguros/types";
import { carregarApoliceForm } from "../_components/carregarApolice";
import ApoliceDetail from "./ApoliceDetail";

export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ corretoraId: string; apoliceId: string }>;
    searchParams: Promise<{ aba?: string }>;
}) {
    const { corretoraId, apoliceId } = await params;
    const { aba } = await searchParams;
    const supabase = await createClient();

    const carregado = await carregarApoliceForm(supabase, apoliceId);
    if (!carregado || carregado.corretoraId !== corretoraId) notFound();

    const [{ data: extra }, { data: renovacao }, { data: parcelas }, { data: endossos }, { data: coberturasEndosso }, { data: sinistros }] = await Promise.all([
        supabase.from("apolices").select("cancelada_em, seguradora:seguradoras(nome, telefone_assistencia, telefone_sinistro)").eq("id", apoliceId).single(),
        supabase.from("apolices").select("id, numero").eq("apolice_anterior_id", apoliceId).maybeSingle(),
        supabase.from("parcelas").select("id, endosso_id, numero, vencimento, valor, comissao_esperada, status, baixa_origem, baixa_em, linha_digitavel, pix_copia_cola").eq("apolice_id", apoliceId).order("vencimento"),
        supabase.from("endossos").select("id, numero, tipo, data_emissao, descricao, valor").eq("apolice_id", apoliceId).order("criado_em"),
        supabase.from("coberturas").select("id, endosso_id, nome, importancia_segurada, franquia").eq("apolice_id", apoliceId).not("endosso_id", "is", null),
        supabase.from("sinistros").select("id, data_ocorrencia, tipo, status, numero_seguradora").eq("apolice_id", apoliceId).order("data_ocorrencia", { ascending: false }),
    ]);

    let anterior: { id: string; numero: string } | null = null;
    if (carregado.form.apoliceAnteriorId) {
        const { data } = await supabase.from("apolices").select("id, numero").eq("id", carregado.form.apoliceAnteriorId).maybeSingle();
        anterior = data as { id: string; numero: string } | null;
    }

    const status = calcularStatusApolice({
        canceladaEm: (extra?.cancelada_em as string | null) ?? null,
        fimVigencia: carregado.form.fimVigencia,
        foiRenovada: !!renovacao,
        hoje: hojeSaoPaulo(),
    });

    const sinistrosLinhas: SinistroLinha[] = (sinistros ?? []).map((s) => ({
        id: s.id as string,
        apolice_id: apoliceId,
        apolice_numero: carregado.form.numero,
        ramo: carregado.form.ramo,
        contato_nome: carregado.contato.nome,
        data_ocorrencia: s.data_ocorrencia as string,
        tipo: s.tipo as string,
        status: s.status as SinistroLinha["status"],
        numero_seguradora: s.numero_seguradora as string | null,
    }));

    return (
        <ApoliceDetail
            corretoraId={corretoraId}
            apoliceId={apoliceId}
            form={carregado.form}
            contato={carregado.contato}
            seguradora={extra?.seguradora as unknown as { nome: string; telefone_assistencia: string | null; telefone_sinistro: string | null }}
            canceladaEm={(extra?.cancelada_em as string | null) ?? null}
            status={status}
            anterior={anterior}
            renovacao={renovacao as { id: string; numero: string } | null}
            parcelas={(parcelas ?? []) as Parcela[]}
            endossos={(endossos ?? []) as Endosso[]}
            coberturasEndosso={(coberturasEndosso ?? []) as Cobertura[]}
            sinistros={sinistrosLinhas}
            abaInicial={aba ?? "resumo"}
        />
    );
}
