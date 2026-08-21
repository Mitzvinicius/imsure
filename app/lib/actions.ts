'use server'

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function criarConta({ nome }: { nome: string }) {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const usuario = await supabase.auth.getUser();

    if (!usuario.data.user) {
        return { error: "Usuario não encontrado" };
    }

    const { data: plano } = await supabase
        .from("planos")
        .select("id")
        .eq("nome", "Starter")
        .single();

    if (!plano) {
        return { error: "Plano padrão não encontrado" };
    }

    const { data: novaConta, error: erroConta } = await supabase
        .from("contas")
        .insert({ nome, plano_id: plano.id, owner_usuario_id: usuario.data.user.id })
        .select()
        .single();

    if (erroConta || !novaConta) {
        return { error: erroConta?.message ?? "Não foi possível criar a conta" };
    }

    const { error: erroCorretora } = await supabase
        .from("corretoras")
        .insert({ nome, conta_id: novaConta.id })
        .select()
        .single();

    if (erroCorretora) {
        return { error: erroCorretora.message };
    }

    return { error: null };
}

export async function atualizarDadosCorretora({
    corretoraId,
    nome,
    cnpj,
    registroSusep,
}: {
    corretoraId: string;
    nome: string;
    cnpj: string;
    registroSusep: string;
}) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { error } = await supabase
        .from("corretoras")
        .update({ nome, cnpj, registro_susep: registroSusep })
        .eq("id", corretoraId);

    if (error) {
        return { error: error.message };
    }
    return { error: null };
}

export async function salvarRamosAtuacao({
    corretoraId,
    ramos,
}: {
    corretoraId: string;
    ramos: string[];
}) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { error } = await supabase
        .from("corretoras")
        .update({ ramos_atuacao: ramos })
        .eq("id", corretoraId);

    if (error) {
        return { error: error.message };
    }
    return { error: null };
}

export async function salvarFluxoVendas({
    corretoraId,
    etapas,
}: {
    corretoraId: string;
    etapas: string[];
}) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { data: fluxoExistente } = await supabase
        .from("fluxos")
        .select("id")
        .eq("corretora_id", corretoraId)
        .maybeSingle();

    let fluxoId = fluxoExistente?.id as string | undefined;

    if (!fluxoId) {
        const { data: novoFluxo, error: erroFluxo } = await supabase
            .from("fluxos")
            .insert({ corretora_id: corretoraId, nome: "Funil principal" })
            .select("id")
            .single();

        if (erroFluxo || !novoFluxo) {
            return { error: erroFluxo?.message ?? "Não foi possível criar o funil" };
        }
        fluxoId = novoFluxo.id;
    } else {
        const { error: erroLimpeza } = await supabase
            .from("etapas")
            .delete()
            .eq("fluxo_id", fluxoId);

        if (erroLimpeza) {
            return { error: erroLimpeza.message };
        }
    }

    const { error: erroEtapas } = await supabase
        .from("etapas")
        .insert(etapas.map((nome, index) => ({ fluxo_id: fluxoId, nome, ordem: index })));

    if (erroEtapas) {
        return { error: erroEtapas.message };
    }
    return { error: null };
}

export async function selecionarPlano({
    corretoraId,
    planoId,
}: {
    corretoraId: string;
    planoId: string;
}) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { data: corretora, error: erroCorretora } = await supabase
        .from("corretoras")
        .select("conta_id")
        .eq("id", corretoraId)
        .single();

    if (erroCorretora || !corretora) {
        return { error: erroCorretora?.message ?? "Corretora não encontrada" };
    }

    const { error } = await supabase
        .from("contas")
        .update({ plano_id: planoId })
        .eq("id", corretora.conta_id);

    if (error) {
        return { error: error.message };
    }
    return { error: null };
}

export async function concluirOnboarding({ corretoraId }: { corretoraId: string }) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { error } = await supabase
        .from("corretoras")
        .update({ onboarding_concluido: true })
        .eq("id", corretoraId);

    if (error) {
        return { error: error.message };
    }
    return { error: null };
}
