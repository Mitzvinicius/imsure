import { createClient } from "@/utils/supabase/server";
import NovoSinistroForm, { type ApoliceOpcao } from "./NovoSinistroForm";

export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ corretoraId: string }>;
    searchParams: Promise<{ apoliceId?: string }>;
}) {
    const { corretoraId } = await params;
    const { apoliceId } = await searchParams;
    const supabase = await createClient();

    const { data } = await supabase
        .from("apolices")
        .select("id, numero, ramo, contato:contatos(nome), bens_auto(id, placa, modelo), bens_residencial(id, logradouro, numero)")
        .eq("corretora_id", corretoraId)
        .is("cancelada_em", null)
        .order("fim_vigencia", { ascending: false });

    return <NovoSinistroForm corretoraId={corretoraId} apolices={(data ?? []) as unknown as ApoliceOpcao[]} apoliceInicialId={apoliceId ?? null} />;
}
