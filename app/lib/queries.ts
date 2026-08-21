import type { createClient } from "@/utils/supabase/server";

type SupabaseServerClient = ReturnType<typeof createClient>;

export type ContaComCorretora = {
    id: string;
    nome: string;
    corretoraId: string | null;
    corretoraNome: string;
    onboardingConcluido: boolean;
};

export async function getContasComCorretoras(supabase: SupabaseServerClient): Promise<ContaComCorretora[]> {
    const { data: contas } = await supabase
        .from("contas")
        .select("id, nome")
        .order("criado_em", { ascending: false });

    const contaIds = (contas ?? []).map((c) => c.id as string);

    const { data: corretoras } = contaIds.length
        ? await supabase
            .from("corretoras")
            .select("id, conta_id, nome, onboarding_concluido")
            .in("conta_id", contaIds)
        : { data: [] as { id: string; conta_id: string; nome: string; onboarding_concluido: boolean }[] };

    const corretoraPorConta = new Map(
        (corretoras ?? []).map((c) => [c.conta_id as string, c])
    );

    return (contas ?? []).map((conta) => {
        const corretora = corretoraPorConta.get(conta.id as string);
        return {
            id: conta.id as string,
            nome: conta.nome as string,
            corretoraId: (corretora?.id as string | undefined) ?? null,
            corretoraNome: (corretora?.nome as string | undefined) ?? (conta.nome as string),
            onboardingConcluido: (corretora?.onboarding_concluido as boolean | undefined) ?? false,
        };
    });
}
