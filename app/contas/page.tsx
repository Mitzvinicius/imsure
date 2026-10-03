import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCorretorasDoUsuario } from "@/app/lib/queries";
import AccountsPage from "./AccountsPage";

export default async function ContasPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth");
    }

    const corretoras = await getCorretorasDoUsuario();
    const accounts = corretoras.map((c) => ({
        id: c.corretoraId,
        nome: c.corretoraNome,
        contaNome: c.contaNome,
        logo: null as string | null,
        papel: (c.souDono ? "owner" : "guest") as "owner" | "guest",
        cargo: c.cargo,
        corretoraId: c.corretoraId as string | null,
        onboardingConcluido: c.onboardingConcluido,
    }));

    const nomeUsuario = (user.user_metadata?.nome as string | undefined) ?? user.email ?? "Usuário";

    return <AccountsPage accounts={accounts} nomeUsuario={nomeUsuario} />;
}
