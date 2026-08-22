import { createClient } from "@/utils/supabase/server";
import { Contact } from "@/app/lib/definitions";
import ContatosPage from "./ContatosPage";

export default async function Page({
    params,
}: {
    params: Promise<{ corretoraId: string }>;
}) {
    const { corretoraId } = await params;
    const supabase = await createClient();

    const { data: contatos } = await supabase
        .from("contatos")
        .select("id, nome, email, telefone, data_nascimento, genero, situacao")
        .eq("corretora_id", corretoraId)
        .order("nome", { ascending: true });

    return (
        <ContatosPage contacts={(contatos ?? []) as Contact[]} />
    );
}
