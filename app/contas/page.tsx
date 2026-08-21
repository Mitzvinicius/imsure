import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getContasComCorretoras } from "@/app/lib/queries";
import AccountsPage from "./AccountsPage";

export default async function ContasPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth");
    }

    const contas = await getContasComCorretoras(supabase);

    const accounts = contas.map((conta) => ({
        id: conta.id,
        nome: conta.nome,
        logo: null as string | null,
        papel: "owner" as const,
        corretoraId: conta.corretoraId,
        onboardingConcluido: conta.onboardingConcluido,
    }));

    const nomeUsuario = (user.user_metadata?.nome as string | undefined) ?? user.email ?? "Usuário";

    return <AccountsPage accounts={accounts} nomeUsuario={nomeUsuario} />;
}
