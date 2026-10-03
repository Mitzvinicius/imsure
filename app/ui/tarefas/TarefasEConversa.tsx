'use client';
import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import { alterarStatusTarefa, listarTarefasDoRegistro, membrosQueVeem } from "@/app/lib/actions-tarefas";
import { compararTarefas, tarefaAberta } from "@/app/lib/tarefas/regras";
import type { Membro, TarefaLinha, Vinculo } from "@/app/lib/tarefas/tipos";
import { hojeSaoPaulo } from "@/app/lib/seguros/datas";
import ListaTarefas from "./ListaTarefas";
import TarefaDialog from "./TarefaDialog";
import Conversa from "./Conversa";

export default function TarefasEConversa({ corretoraId, vinculo }: { corretoraId: string; vinculo: Vinculo }) {
    const { tipo, id } = vinculo;
    const [tarefas, setTarefas] = useState<TarefaLinha[]>([]);
    const [membros, setMembros] = useState<Membro[]>([]);
    const [versao, setVersao] = useState(0);
    const [dialogo, setDialogo] = useState<{ tarefa: TarefaLinha | null } | null>(null);
    const [mostrarFechadas, setMostrarFechadas] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const hoje = hojeSaoPaulo();

    useEffect(() => {
        let ativo = true;
        Promise.all([listarTarefasDoRegistro({ vinculo: { tipo, id } }), membrosQueVeem({ corretoraId, alvo: { tipo, id } })]).then(([t, m]) => {
            if (!ativo) return;
            setTarefas(t.tarefas);
            setMembros(m.membros);
            setErro(t.error ?? m.error);
        });
        return () => { ativo = false; };
    }, [corretoraId, tipo, id, versao]);

    async function alternar(t: TarefaLinha) {
        const status = t.status === "concluida" ? "a_fazer" : "concluida";
        setTarefas((l) => l.map((x) => (x.id === t.id ? { ...x, status } : x)));
        const r = await alterarStatusTarefa({ tarefaId: t.id, status });
        if (r.error) setErro(r.error);
        setVersao((v) => v + 1);
    }

    const abertas = tarefas.filter((t) => tarefaAberta(t.status)).sort(compararTarefas);
    const fechadas = tarefas.filter((t) => !tarefaAberta(t.status));

    return (
        <Stack spacing={2}>
            {erro && <Alert severity="error" onClose={() => setErro(null)}>{erro}</Alert>}
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Tarefas</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setDialogo({ tarefa: null })}>Nova tarefa</Button>
            </Stack>
            <ListaTarefas tarefas={abertas} hoje={hoje} onAbrir={(t) => setDialogo({ tarefa: t })} onAlternar={alternar} vazio="Nenhuma tarefa pendente" />
            {fechadas.length > 0 && (
                <>
                    <Button size="small" onClick={() => setMostrarFechadas((v) => !v)} sx={{ alignSelf: "flex-start" }}>
                        {mostrarFechadas ? "Esconder concluídas" : `Mostrar concluídas (${fechadas.length})`}
                    </Button>
                    {mostrarFechadas && <ListaTarefas tarefas={fechadas} hoje={hoje} onAbrir={(t) => setDialogo({ tarefa: t })} onAlternar={alternar} />}
                </>
            )}
            <Divider />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Conversa</Typography>
            <Conversa corretoraId={corretoraId} alvo={vinculo} membros={membros} />

            {dialogo && (
                <TarefaDialog
                    corretoraId={corretoraId}
                    tarefa={dialogo.tarefa}
                    vinculoInicial={vinculo}
                    permitirEscolherVinculo={false}
                    onFechar={() => setDialogo(null)}
                    onSalvo={() => { setDialogo(null); setVersao((v) => v + 1); }}
                />
            )}
        </Stack>
    );
}
