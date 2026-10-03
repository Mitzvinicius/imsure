import { createClient } from "@/utils/supabase/server";
import { getMembrosAtivos } from "@/app/lib/equipe/sessao";
import { SELECT_TAREFA, normalizarTarefa, type TarefaBruta } from "@/app/lib/tarefas/consultas";
import TarefasPage from "./TarefasPage";

export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ corretoraId: string }>;
    searchParams: Promise<{ tarefa?: string }>;
}) {
    const { corretoraId } = await params;
    const { tarefa: tarefaId } = await searchParams;
    const supabase = await createClient();

    const [abertas, concluidas, membros] = await Promise.all([
        supabase.from("tarefas").select(SELECT_TAREFA).eq("corretora_id", corretoraId).in("status", ["a_fazer", "em_andamento"]),
        supabase.from("tarefas").select(SELECT_TAREFA).eq("corretora_id", corretoraId).in("status", ["concluida", "cancelada"])
            .order("atualizado_em", { ascending: false }).limit(50),
        getMembrosAtivos(corretoraId),
    ]);
    const tarefas = ((abertas.data ?? []) as unknown as TarefaBruta[]).map(normalizarTarefa);
    const fechadas = ((concluidas.data ?? []) as unknown as TarefaBruta[]).map(normalizarTarefa);

    let tarefaInicial = tarefaId ? ([...tarefas, ...fechadas].find((t) => t.id === tarefaId) ?? null) : null;
    if (tarefaId && !tarefaInicial) {
        const { data } = await supabase.from("tarefas").select(SELECT_TAREFA).eq("id", tarefaId).eq("corretora_id", corretoraId).maybeSingle();
        tarefaInicial = data ? normalizarTarefa(data as unknown as TarefaBruta) : null;
    }

    return (
        <TarefasPage
            key={tarefaId ?? "lista"}
            corretoraId={corretoraId}
            tarefas={tarefas}
            concluidas={fechadas}
            membrosAtivos={membros.map((m) => m.id)}
            tarefaInicial={tarefaInicial}
            tarefaNaoEncontrada={!!tarefaId && !tarefaInicial}
        />
    );
}
