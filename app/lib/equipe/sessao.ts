import { createClient } from "@/utils/supabase/server";
import type { Escopo, Permissao } from "./permissoes";

export type MinhasPermissoes = {
    cargo: string;
    cargo_chave: string | null;
    escopo: Escopo;
    permissoes: Permissao[];
    lider: boolean;
    dono: boolean;
};

export async function getMinhasPermissoes(corretoraId: string): Promise<MinhasPermissoes | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("minhas_permissoes", { p_corretora_id: corretoraId });
    if (error || !data) return null;
    return data as MinhasPermissoes;
}
