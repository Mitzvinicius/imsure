import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import OnboardingWizard from "./OnboardingWizard";

export default async function OnboardingPage({
    params,
}: {
    params: Promise<{ corretoraId: string }>;
}) {
    const { corretoraId } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/auth");
    }

    const { data: corretora } = await supabase
        .from("corretoras")
        .select("id, nome, cnpj, registro_susep, ramos_atuacao, onboarding_concluido, conta_id")
        .eq("id", corretoraId)
        .single();

    if (!corretora) {
        redirect("/contas");
    }
    if (corretora.onboarding_concluido) {
        redirect("/contas");
    }

    const { data: conta } = await supabase
        .from("contas")
        .select("plano_id")
        .eq("id", corretora.conta_id)
        .single();

    const { data: planos } = await supabase
        .from("planos")
        .select("id, nome, preco_mensal, permite_cargo_customizado, permite_acesso_global, limite_fluxos_por_tenant, limite_tenants")
        .order("preco_mensal", { ascending: true });

    const { data: fluxo } = await supabase
        .from("fluxos")
        .select("id")
        .eq("corretora_id", corretora.id)
        .maybeSingle();

    let etapasExistentes: string[] = [];
    if (fluxo) {
        const { data: etapas } = await supabase
            .from("etapas")
            .select("nome")
            .eq("fluxo_id", fluxo.id)
            .order("ordem", { ascending: true });
        etapasExistentes = (etapas ?? []).map((e) => e.nome as string);
    }

    return (
        <OnboardingWizard
            corretoraId={corretora.id}
            nomeInicial={corretora.nome}
            cnpjInicial={corretora.cnpj ?? ""}
            registroSusepInicial={corretora.registro_susep ?? ""}
            ramosIniciais={corretora.ramos_atuacao ?? []}
            etapasIniciais={etapasExistentes}
            planoAtualId={conta?.plano_id ?? null}
            planos={planos ?? []}
        />
    );
}
