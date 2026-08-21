import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import ContatosPage from "./ContatosPage";
import { Contact } from "@/app/lib/definitions";

export default async function Page({
    params,
}: {
    params: Promise<{ corretoraId: string }>;
}) {
    const { corretoraId } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: contatos } = await supabase
        .from("contatos")
        .select("id, nome, email, telefone, data_nascimento, genero, situacao")
        .eq("corretora_id", corretoraId)
        .order("nome", { ascending: true });

    return <ContatosPage contacts={(contatos ?? []) as Contact[]} />;
}
