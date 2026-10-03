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

export async function getMembrosAtivos(corretoraId: string): Promise<{ id: string; nome: string }[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("usuario_corretora")
        .select("usuario:usuarios(id, nome)")
        .eq("corretora_id", corretoraId)
        .eq("ativo", true);
    return ((data ?? []) as unknown as { usuario: { id: string; nome: string } | null }[])
        .map((l) => l.usuario)
        .filter((u): u is { id: string; nome: string } => !!u)
        .sort((a, b) => a.nome.localeCompare(b.nome));
}
