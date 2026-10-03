'use server'

import { createClient } from "@/utils/supabase/server";

function mensagem(error: { code?: string; message: string }) {
    if (error.code === "42501" && !/permissão/i.test(error.message)) return "Você não tem permissão para fazer isso.";
    if (error.code === "23505" && error.message.includes("equipes_corretora_nome_key")) return "Já existe uma equipe com esse nome.";
    return error.message;
}

export async function convidarMembro({ corretoraId, email, cargoId }: { corretoraId: string; email: string; cargoId: string }) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("criar_convite", { p_corretora_id: corretoraId, p_email: email, p_cargo_id: cargoId });
    if (error) return { error: mensagem(error), token: null };
    return { error: null, token: data as string };
}

export async function gerarNovoLinkConvite({ conviteId }: { conviteId: string }) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("regenerar_convite", { p_convite_id: conviteId });
    if (error) return { error: mensagem(error), token: null };
    return { error: null, token: data as string };
}

export async function cancelarConvite({ conviteId }: { conviteId: string }) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("cancelar_convite", { p_convite_id: conviteId });
    return { error: error ? mensagem(error) : null };
}

export async function aceitarConvite({ token }: { token: string }) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("aceitar_convite", { p_token: token });
    if (error) return { error: mensagem(error), corretoraId: null };
    return { error: null, corretoraId: data as string };
}

export async function alterarCargoMembro({ corretoraId, usuarioId, cargoId }: { corretoraId: string; usuarioId: string; cargoId: string }) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("usuario_corretora")
        .update({ cargo_id: cargoId })
        .eq("corretora_id", corretoraId)
        .eq("usuario_id", usuarioId)
        .select("usuario_id");
    if (error) return { error: mensagem(error) };
    if (!data?.length) return { error: "Você não tem permissão para alterar membros." };
    return { error: null };
}

export async function alterarStatusMembro({ corretoraId, usuarioId, ativo }: { corretoraId: string; usuarioId: string; ativo: boolean }) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("usuario_corretora")
        .update({ ativo })
        .eq("corretora_id", corretoraId)
        .eq("usuario_id", usuarioId)
        .select("usuario_id");
    if (error) return { error: mensagem(error) };
    if (!data?.length) return { error: "Você não tem permissão para alterar membros." };
    return { error: null };
}

export async function transferirCarteira({ corretoraId, deUsuarioId, paraUsuarioId }: { corretoraId: string; deUsuarioId: string; paraUsuarioId: string }) {
    if (deUsuarioId === paraUsuarioId) return { error: "Escolha outra pessoa para receber a carteira.", total: 0 };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("transferir_carteira", { p_corretora_id: corretoraId, p_de: deUsuarioId, p_para: paraUsuarioId });
    if (error) return { error: mensagem(error), total: 0 };
    return { error: null, total: (data as number) ?? 0 };
}

export async function salvarEquipe({
    corretoraId,
    equipeId,
    nome,
    ramos,
    membros,
}: {
    corretoraId: string;
    equipeId: string | null;
    nome: string;
    ramos: string[];
    membros: { usuarioId: string; lider: boolean }[];
}) {
    if (!nome.trim()) return { error: "Informe o nome da equipe." };
    const supabase = await createClient();
    let id = equipeId;
    if (id) {
        const { error } = await supabase.from("equipes").update({ nome: nome.trim(), ramos }).eq("id", id);
        if (error) return { error: mensagem(error) };
        const { error: erroLimpar } = await supabase.from("equipe_membros").delete().eq("equipe_id", id);
        if (erroLimpar) return { error: mensagem(erroLimpar) };
    } else {
        const { data, error } = await supabase.from("equipes").insert({ corretora_id: corretoraId, nome: nome.trim(), ramos }).select("id").single();
        if (error || !data) return { error: error ? mensagem(error) : "Não foi possível criar a equipe." };
        id = data.id as string;
    }
    if (membros.length) {
        const { error } = await supabase.from("equipe_membros").insert(membros.map((m) => ({ equipe_id: id, usuario_id: m.usuarioId, lider: m.lider })));
        if (error) return { error: mensagem(error) };
    }
    return { error: null };
}

export async function excluirEquipe({ equipeId }: { equipeId: string }) {
    const supabase = await createClient();
    const { error } = await supabase.from("equipes").delete().eq("id", equipeId);
    return { error: error ? mensagem(error) : null };
}
