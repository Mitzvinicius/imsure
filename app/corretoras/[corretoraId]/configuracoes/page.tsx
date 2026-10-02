import { createClient } from "@/utils/supabase/server";
import ConfiguracoesPage from "./ConfiguracoesPage";

export default async function Page({ params }: { params: Promise<{ corretoraId: string }> }) {
    const { corretoraId } = await params;
    const supabase = await createClient();

    const { data: corretora } = await supabase.from("corretoras").select("dias_antecedencia_renovacao").eq("id", corretoraId).single();
    const { data: fluxos } = await supabase.from("fluxos").select("id, ativo, criado_em").eq("corretora_id", corretoraId).order("criado_em");
    const fluxo = (fluxos ?? []).find((f) => f.ativo) ?? fluxos?.[0] ?? null;

    const { data: etapas } = fluxo
        ? await supabase.from("etapas").select("id, nome, ordem, renovacao").eq("fluxo_id", fluxo.id).order("ordem")
        : { data: [] as { id: string; nome: string; ordem: number; renovacao: boolean }[] };

    return (
        <ConfiguracoesPage
            corretoraId={corretoraId}
            diasIniciais={(corretora?.dias_antecedencia_renovacao as number | undefined) ?? 60}
            etapas={(etapas ?? []) as { id: string; nome: string; renovacao: boolean }[]}
        />
    );
}
