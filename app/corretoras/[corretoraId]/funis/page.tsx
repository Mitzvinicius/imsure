import { createClient } from "@/utils/supabase/server";
import FunisPage from "./FunisPage";
import type { Etapa, Fluxo, Negocio } from "./types";

export default async function Page({
    params,
}: {
    params: Promise<{ corretoraId: string }>;
}) {
    const { corretoraId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    const nomeUsuario = (user?.user_metadata?.nome as string | undefined) ?? user?.email ?? "Você";

    const { data: corretora } = await supabase
        .from("corretoras")
        .select("nome, ramos_atuacao")
        .eq("id", corretoraId)
        .single();

    const { data: fluxosData } = await supabase
        .from("fluxos")
        .select("id, nome, ativo")
        .eq("corretora_id", corretoraId)
        .order("criado_em", { ascending: true });

    const fluxos = (fluxosData ?? []) as Fluxo[];
    const fluxoAtivo = fluxos.find((f) => f.ativo) ?? fluxos[0] ?? null;

    let etapas: Etapa[] = [];
    let negocios: Negocio[] = [];

    if (fluxoAtivo) {
        const { data: etapasData } = await supabase
            .from("etapas")
            .select("id, nome, ordem")
            .eq("fluxo_id", fluxoAtivo.id)
            .order("ordem", { ascending: true });
        etapas = (etapasData ?? []) as Etapa[];

        const etapaIds = etapas.map((e) => e.id);
        if (etapaIds.length) {
            const { data: negociosData } = await supabase
                .from("negocios")
                .select("id, etapa_id, tipo, ramo, seguradora, origem, grupo_producao, valor, indicacao, criado_em, fechado_em, contato:contatos(id, nome, telefone, email, cpf_cnpj, tipo_pessoa, profissoes), vendedor:usuarios(id, nome)")
                .in("etapa_id", etapaIds)
                .order("criado_em", { ascending: false });
            negocios = (negociosData ?? []) as unknown as Negocio[];
        }
    }

    return (
        <FunisPage
            corretoraId={corretoraId}
            corretoraNome={corretora?.nome ?? ""}
            nomeUsuario={nomeUsuario}
            ramosAtuacao={(corretora?.ramos_atuacao as string[] | null) ?? []}
            fluxosIniciais={fluxos}
            etapasIniciais={etapas}
            negociosIniciais={negocios}
        />
    );
}
