'use server'

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {redirect} from "next/navigation";

export async function criarConta(formData: FormData) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const usuario = await supabase.auth.getUser();

    if (!usuario.data.user) {
        throw new Error("Usuario não encontrado");
    }
    const nomeCorretora = formData.get("corretora");

    const { data: plano} = await supabase
        .from("planos")
        .select("id")
        .eq("nome", "Starter")
        .single();

    if (!plano) {
        throw new Error("Usuario não encontrado");
    }

    const { data: novaConta } = await supabase
        .from("contas")
        .insert({ nome: nomeCorretora, plano_id: plano.id, owner_usuario_id: usuario.data.user.id })
        .select()
        .single();

    const {data: novaCorretora} = await supabase
        .from("corretoras")
        .insert({ nome: nomeCorretora, conta_id: novaConta.id})
        .select()
        .single();

redirect("/dashboard");
}