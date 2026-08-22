import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getContasComCorretoras } from "@/app/lib/queries";
import Sidebar from "@/app/ui/design/Sidebar";
import Box from "@mui/material/Box";

export default async function CorretoraLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ corretoraId: string }>;
}) {
    const { corretoraId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/auth");
    }

    const { data: corretora } = await supabase
        .from("corretoras")
        .select("id, nome, onboarding_concluido")
        .eq("id", corretoraId)
        .single();

    if (!corretora) {
        redirect("/contas");
    }
    if (!corretora.onboarding_concluido) {
        redirect(`/onboarding/${corretoraId}`);
    }

    const accounts = await getContasComCorretoras();

    return (
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar
                accounts={accounts}
                currentCorretoraId={corretora.id}
                currentCorretoraNome={corretora.nome}
            />
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                {children}
            </Box>
        </Box>
    );
}
