import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AccountsPage from "./AccountsPage";

export default async function ContasPage() {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth");
    }

    const { data: contas } = await supabase
        .from("contas")
        .select("id, nome")
        .order("criado_em", { ascending: false });

    const contaIds = (contas ?? []).map((c) => c.id as string);

    const { data: corretoras } = contaIds.length
        ? await supabase
            .from("corretoras")
            .select("id, conta_id, onboarding_concluido")
            .in("conta_id", contaIds)
        : { data: [] };

    const corretoraPorConta = new Map(
        (corretoras ?? []).map((c) => [c.conta_id as string, c])
    );

    const accounts = (contas ?? []).map((conta) => {
        const corretora = corretoraPorConta.get(conta.id as string);
        return {
            id: conta.id as string,
            nome: conta.nome as string,
            logo: null as string | null,
            papel: "owner" as const,
            corretoraId: (corretora?.id as string | undefined) ?? null,
            onboardingConcluido: (corretora?.onboarding_concluido as boolean | undefined) ?? false,
        };
    });

    const nomeUsuario = (user.user_metadata?.nome as string | undefined) ?? user.email ?? "Usuário";

    return <AccountsPage accounts={accounts} nomeUsuario={nomeUsuario} />;
}
