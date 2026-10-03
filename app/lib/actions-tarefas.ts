'use server'

import { createClient } from "@/utils/supabase/server";
import { SELECT_TAREFA, normalizarTarefa, type TarefaBruta } from "@/app/lib/tarefas/consultas";
import { colunaAlvo, colunasVinculo, paramsAlvo, validarTarefa } from "@/app/lib/tarefas/regras";
import type { Alvo, ComentarioLinha, DadosTarefa, Membro, RegistroBusca, StatusTarefa, TarefaLinha, Vinculo } from "@/app/lib/tarefas/tipos";

function mensagem(error: { code?: string; message: string }) {
    if (error.code === "42501" && /row-level security|permission denied/i.test(error.message)) return "Você não tem permissão para fazer isso.";
    if (error.code === "23514" && /_check"?$/.test(error.message)) return "Confira os campos da tarefa.";
    return error.message;
}

export async function listarTarefasDoRegistro({ vinculo }: { vinculo: Vinculo }) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tarefas")
        .select(SELECT_TAREFA)
        .eq(colunaAlvo(vinculo), vinculo.id)
        .order("criado_em", { ascending: false });
    if (error) return { error: mensagem(error), tarefas: [] as TarefaLinha[] };
    return { error: null, tarefas: ((data ?? []) as unknown as TarefaBruta[]).map(normalizarTarefa) };
}

function colunasDados(dados: DadosTarefa) {
    return {
        titulo: dados.titulo.trim(),
        descricao: dados.descricao.trim() || null,
        responsavel_usuario_id: dados.responsavelId,
        prazo: dados.prazo || null,
        prazo_hora: dados.prazo ? (dados.prazoHora || null) : null,
        prioridade: dados.prioridade,
    };
}

export async function criarTarefa({ corretoraId, dados, vinculo }: { corretoraId: string; dados: DadosTarefa; vinculo: Vinculo | null }) {
    const invalido = validarTarefa(dados);
    if (invalido) return { error: invalido, id: null };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada. Entre de novo.", id: null };
    const { data, error } = await supabase
        .from("tarefas")
        .insert({ corretora_id: corretoraId, criado_por: user.id, ...colunasDados(dados), ...colunasVinculo(vinculo) })
        .select("id")
        .single();
    if (error) return { error: mensagem(error), id: null };
    return { error: null, id: data.id as string };
}

export async function atualizarTarefa({ tarefaId, dados }: { tarefaId: string; dados: DadosTarefa }) {
    const invalido = validarTarefa(dados);
    if (invalido) return { error: invalido };
    const supabase = await createClient();
    // RPC (security definer): o responsável pode repassar a tarefa mesmo deixando de enxergá-la depois
    const { error } = await supabase.rpc("atualizar_tarefa", {
        p_tarefa_id: tarefaId,
        p_titulo: dados.titulo,
        p_descricao: dados.descricao,
        p_responsavel: dados.responsavelId,
        p_prazo: dados.prazo || null,
        p_prazo_hora: dados.prazo ? (dados.prazoHora || null) : null,
        p_prioridade: dados.prioridade,
        p_status: dados.status,
    });
    return { error: error ? mensagem(error) : null };
}

export async function alterarStatusTarefa({ tarefaId, status }: { tarefaId: string; status: StatusTarefa }) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("alterar_status_tarefa", { p_tarefa_id: tarefaId, p_status: status });
    return { error: error ? mensagem(error) : null };
}

export async function excluirTarefa({ tarefaId }: { tarefaId: string }) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("tarefas").delete().eq("id", tarefaId).select("id");
    if (error) return { error: mensagem(error) };
    if (!data?.length) return { error: "Só quem criou a tarefa (ou um administrador) pode excluí-la." };
    return { error: null };
}

export async function listarComentarios({ alvo }: { alvo: Alvo }) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("comentarios")
        .select("id, texto, criado_em, editado_em, autor:usuarios!comentarios_autor_usuario_id_fkey(id, nome)")
        .eq(colunaAlvo(alvo), alvo.id)
        .order("criado_em", { ascending: false });
    if (error) return { error: mensagem(error), comentarios: [] as ComentarioLinha[] };
    return { error: null, comentarios: (data ?? []) as unknown as ComentarioLinha[] };
}

export async function comentar({ corretoraId, alvo, texto, mencoes }: { corretoraId: string; alvo: Alvo; texto: string; mencoes: string[] }) {
    if (!texto.trim()) return { error: "Escreva alguma coisa antes de enviar." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("comentar", {
        p_corretora_id: corretoraId,
        p_texto: texto,
        p_mencoes: mencoes,
        ...paramsAlvo(alvo),
    });
    return { error: error ? mensagem(error) : null };
}

export async function editarComentario({ comentarioId, texto }: { comentarioId: string; texto: string }) {
    if (!texto.trim()) return { error: "O comentário não pode ficar vazio." };
    const supabase = await createClient();
    const { data, error } = await supabase.from("comentarios").update({ texto: texto.trim() }).eq("id", comentarioId).select("id");
    if (error) return { error: mensagem(error) };
    if (!data?.length) return { error: "Só o autor pode editar o comentário." };
    return { error: null };
}

export async function excluirComentario({ comentarioId }: { comentarioId: string }) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("comentarios").delete().eq("id", comentarioId).select("id");
    if (error) return { error: mensagem(error) };
    if (!data?.length) return { error: "Só o autor pode excluir o comentário." };
    return { error: null };
}

export async function membrosQueVeem({ corretoraId, alvo }: { corretoraId: string; alvo: Alvo | null }) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("membros_que_veem_registro", { p_corretora_id: corretoraId, ...paramsAlvo(alvo) });
    if (error) return { error: mensagem(error), membros: [] as Membro[] };
    return { error: null, membros: (data ?? []) as Membro[] };
}

/** Quem pode assumir uma tarefa existente (funciona mesmo se quem pergunta perdeu acesso ao registro). */
export async function responsaveisPossiveis({ tarefaId }: { tarefaId: string }) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("responsaveis_possiveis", { p_tarefa_id: tarefaId });
    if (error) return { error: mensagem(error), membros: [] as Membro[] };
    return { error: null, membros: (data ?? []) as Membro[] };
}

export async function buscarRegistros({ corretoraId, termo }: { corretoraId: string; termo: string }) {
    if (termo.trim().length < 2) return { error: null, registros: [] as RegistroBusca[] };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("buscar_registros", { p_corretora_id: corretoraId, p_termo: termo.trim() });
    if (error) return { error: mensagem(error), registros: [] as RegistroBusca[] };
    return { error: null, registros: (data ?? []) as RegistroBusca[] };
}
