import { createClient } from "@/utils/supabase/server";
import ConviteAceite from "./ConviteAceite";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const supabase = await createClient();
    const [{ data: info }, { data: { user } }] = await Promise.all([
        supabase.rpc("info_convite", { p_token: token }).single(),
        supabase.auth.getUser(),
    ]);
    type Info = { corretora_nome: string | null; cargo_nome: string | null; convidado_por: string | null; email: string | null; situacao: string };
    return <ConviteAceite token={token} info={(info as Info | null) ?? { corretora_nome: null, cargo_nome: null, convidado_por: null, email: null, situacao: "invalido" }} emailLogado={user?.email ?? null} />;
}
