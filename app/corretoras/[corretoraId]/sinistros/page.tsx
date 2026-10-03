import { createClient } from "@/utils/supabase/server";
import type { SinistroLinha } from "@/app/lib/seguros/types";
import SinistrosPage from "./SinistrosPage";

export default async function Page({ params }: { params: Promise<{ corretoraId: string }> }) {
    const { corretoraId } = await params;
    const supabase = await createClient();

    const { data } = await supabase
        .from("sinistros")
        .select("id, data_ocorrencia, tipo, status, numero_seguradora, apolice:apolices!inner(id, numero, ramo, corretora_id, contato:contatos(nome))")
        .eq("apolice.corretora_id", corretoraId)
        .order("data_ocorrencia", { ascending: false });

    type Linha = { id: string; data_ocorrencia: string; tipo: string; status: SinistroLinha["status"]; numero_seguradora: string | null; apolice: { id: string; numero: string; ramo: string; contato: { nome: string } | null } };
    const sinistros: SinistroLinha[] = ((data ?? []) as unknown as Linha[]).map((s) => ({
        id: s.id,
        apolice_id: s.apolice.id,
        apolice_numero: s.apolice.numero,
        ramo: s.apolice.ramo,
        contato_nome: s.apolice.contato?.nome ?? "—",
        data_ocorrencia: s.data_ocorrencia,
        tipo: s.tipo,
        status: s.status,
        numero_seguradora: s.numero_seguradora,
    }));

    return <SinistrosPage corretoraId={corretoraId} sinistros={sinistros} />;
}
