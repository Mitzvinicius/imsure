import { createClient } from "@/utils/supabase/server";
import { calcularStatusApolice } from "@/app/lib/seguros/status";
import { hojeSaoPaulo } from "@/app/lib/seguros/datas";
import type { ApoliceLinha } from "@/app/lib/seguros/types";
import ApolicesPage from "./ApolicesPage";

type LinhaBanco = {
    id: string;
    numero: string;
    ramo: string;
    inicio_vigencia: string;
    fim_vigencia: string;
    premio: number | null;
    cancelada_em: string | null;
    contato: { nome: string } | null;
    seguradora: { nome: string } | null;
    bens_auto: { placa: string | null; chassi: string | null }[];
    parcelas: { vencimento: string; status: string }[];
};

export default async function Page({ params }: { params: Promise<{ corretoraId: string }> }) {
    const { corretoraId } = await params;
    const supabase = await createClient();
    const hoje = hojeSaoPaulo();

    const { data } = await supabase
        .from("apolices")
        .select("id, numero, ramo, inicio_vigencia, fim_vigencia, premio, cancelada_em, contato:contatos(nome), seguradora:seguradoras(nome), bens_auto(placa, chassi), parcelas(vencimento, status)")
        .eq("corretora_id", corretoraId)
        .order("fim_vigencia", { ascending: true });

    const linhasBanco = (data ?? []) as unknown as LinhaBanco[];

    const { data: renovadasData } = await supabase
        .from("apolices")
        .select("apolice_anterior_id")
        .eq("corretora_id", corretoraId)
        .not("apolice_anterior_id", "is", null);
    const renovadas = new Set((renovadasData ?? []).map((r) => r.apolice_anterior_id as string));

    const linhas: ApoliceLinha[] = linhasBanco.map((a) => ({
        id: a.id,
        numero: a.numero,
        ramo: a.ramo,
        inicio_vigencia: a.inicio_vigencia,
        fim_vigencia: a.fim_vigencia,
        premio: a.premio,
        status: calcularStatusApolice({ canceladaEm: a.cancelada_em, fimVigencia: a.fim_vigencia, foiRenovada: renovadas.has(a.id), hoje }),
        contato_nome: a.contato?.nome ?? "—",
        seguradora_nome: a.seguradora?.nome ?? "—",
        placas: a.bens_auto.map((b) => b.placa ?? "").filter(Boolean),
        chassis: a.bens_auto.map((b) => b.chassi ?? "").filter(Boolean),
        proxima_parcela: a.parcelas
            .filter((p) => p.status === "aberta")
            .map((p) => p.vencimento)
            .sort()[0] ?? null,
    }));

    return <ApolicesPage corretoraId={corretoraId} apolices={linhas} hoje={hoje} />;
}
