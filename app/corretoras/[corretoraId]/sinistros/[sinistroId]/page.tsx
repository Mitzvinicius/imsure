import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Andamento } from "@/app/lib/seguros/types";
import type { StatusSinistro } from "@/app/lib/seguros/sinistros";
import SinistroDetail from "./SinistroDetail";

export default async function Page({ params }: { params: Promise<{ corretoraId: string; sinistroId: string }> }) {
    const { corretoraId, sinistroId } = await params;
    const supabase = await createClient();

    const { data: s } = await supabase
        .from("sinistros")
        .select("id, data_ocorrencia, tipo, descricao, numero_seguradora, status, valor_indenizacao, apolice:apolices(id, numero, ramo, corretora_id, contato:contatos(nome), seguradora:seguradoras(nome, telefone_sinistro))")
        .eq("id", sinistroId)
        .maybeSingle();

    type Apolice = { id: string; numero: string; ramo: string; corretora_id: string; contato: { nome: string } | null; seguradora: { nome: string; telefone_sinistro: string | null } | null };
    const apolice = s?.apolice as unknown as Apolice | undefined;
    if (!s || !apolice || apolice.corretora_id !== corretoraId) notFound();

    const { data: andamentos } = await supabase
        .from("sinistro_andamentos")
        .select("id, data, descricao, status_novo, numero_processo, usuario_nome")
        .eq("sinistro_id", sinistroId)
        .order("data", { ascending: false });

    return (
        <SinistroDetail
            corretoraId={corretoraId}
            sinistro={{
                id: s.id as string,
                data_ocorrencia: s.data_ocorrencia as string,
                tipo: s.tipo as string,
                descricao: s.descricao as string | null,
                numero_seguradora: s.numero_seguradora as string | null,
                status: s.status as StatusSinistro,
                valor_indenizacao: s.valor_indenizacao as number | null,
            }}
            apolice={apolice}
            andamentos={(andamentos ?? []) as Andamento[]}
        />
    );
}
