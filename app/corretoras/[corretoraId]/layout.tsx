import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCorretorasDoUsuario } from "@/app/lib/queries";
import { getMinhasPermissoes } from "@/app/lib/equipe/sessao";
import { PermissoesProvider } from "@/app/ui/design/PermissoesContext";
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

    const [corretoras, permissoes] = await Promise.all([getCorretorasDoUsuario(), getMinhasPermissoes(corretoraId)]);
    if (!permissoes) {
        redirect("/contas");
    }

    return (
        <PermissoesProvider valor={permissoes}>
            <Box sx={{ display: "flex", minHeight: "100vh" }}>
                <Sidebar
                    corretoras={corretoras}
                    currentCorretoraId={corretora.id}
                    currentCorretoraNome={corretora.nome}
                />
                <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                    {children}
                </Box>
            </Box>
        </PermissoesProvider>
    );
}
