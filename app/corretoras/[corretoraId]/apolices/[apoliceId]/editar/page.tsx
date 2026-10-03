import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getMembrosAtivos } from "@/app/lib/equipe/sessao";
import { RAMOS_OPCOES } from "@/app/lib/seguros/ramos";
import type { Seguradora } from "@/app/lib/seguros/types";
import ApoliceForm from "../../_components/ApoliceForm";
import { carregarApoliceForm } from "../../_components/carregarApolice";

export default async function Page({ params }: { params: Promise<{ corretoraId: string; apoliceId: string }> }) {
    const { corretoraId, apoliceId } = await params;
    const supabase = await createClient();

    const carregado = await carregarApoliceForm(supabase, apoliceId);
    if (!carregado || carregado.corretoraId !== corretoraId) notFound();

    const [{ data: seguradoras }, { data: corretora }] = await Promise.all([
        supabase.from("seguradoras").select("id, nome, telefone_assistencia, telefone_sinistro").order("nome"),
        supabase.from("corretoras").select("ramos_atuacao").eq("id", corretoraId).single(),
    ]);
    const ramosCorretora = (corretora?.ramos_atuacao as string[] | null) ?? [];

    return (
        <ApoliceForm
            corretoraId={corretoraId}
            modo="editar"
            apoliceId={apoliceId}
            inicial={carregado.form}
            contatoInicial={carregado.contato}
            seguradoras={(seguradoras ?? []) as Seguradora[]}
            ramos={ramosCorretora.length ? ramosCorretora : [...RAMOS_OPCOES]}
            membros={await getMembrosAtivos(corretoraId)}
        />
    );
}
