'use client';
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import { alterarStatusTarefa } from "@/app/lib/actions-tarefas";
import {
    GRUPOS_PRAZO, LABEL_PRIORIDADE, LABEL_TIPO_VINCULO, agruparPorPrazo, filtrarTarefas,
    type FiltrosTarefas, type VisaoTarefas,
} from "@/app/lib/tarefas/regras";
import type { Prioridade, TarefaLinha, TipoVinculo } from "@/app/lib/tarefas/tipos";
import { hojeSaoPaulo } from "@/app/lib/seguros/datas";
import { usePermissoes } from "@/app/ui/design/PermissoesContext";
import ListaTarefas from "@/app/ui/tarefas/ListaTarefas";
import TarefaDialog from "@/app/ui/tarefas/TarefaDialog";

export default function TarefasPage({ corretoraId, tarefas: tarefasProps, concluidas, membrosAtivos, tarefaInicial, tarefaNaoEncontrada }: {
    corretoraId: string;
    tarefas: TarefaLinha[];
    concluidas: TarefaLinha[];
    membrosAtivos: string[];
    tarefaInicial: TarefaLinha | null;
    tarefaNaoEncontrada: boolean;
}) {
    const router = useRouter();
    const { usuarioId, escopo, lider, pode } = usePermissoes();
    const [base, setBase] = useState(tarefasProps);
    const [tarefas, setTarefas] = useState(tarefasProps);
    if (base !== tarefasProps) { setBase(tarefasProps); setTarefas(tarefasProps); }
    const [filtros, setFiltros] = useState<FiltrosTarefas>({ visao: "minhas", prioridade: "", tipo: "" });
    const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
    const [dialogo, setDialogo] = useState<{ tarefa: TarefaLinha | null } | null>(tarefaInicial ? { tarefa: tarefaInicial } : null);
    const [erro, setErro] = useState<string | null>(tarefaNaoEncontrada ? "Tarefa não encontrada (foi excluída ou você não tem acesso a ela)." : null);
    const hoje = hojeSaoPaulo();
    const ativos = useMemo(() => new Set(membrosAtivos), [membrosAtivos]);

    const visoes: { valor: VisaoTarefas; rotulo: string }[] = [
        { valor: "minhas", rotulo: "Minhas" },
        { valor: "criadas", rotulo: "Criadas por mim" },
        ...(lider || escopo === "equipe" ? [{ valor: "equipe" as const, rotulo: "Equipe" }] : []),
        ...(escopo === "tudo" ? [{ valor: "todas" as const, rotulo: "Todas" }] : []),
        ...(pode("equipe.membros") ? [{ valor: "sem_responsavel" as const, rotulo: "Sem responsável ativo" }] : []),
    ];
    const ctx = { usuarioId, membrosAtivos: ativos };
    const grupos = agruparPorPrazo(filtrarTarefas(tarefas, filtros, ctx), hoje);
    const fechadasFiltradas = filtrarTarefas(concluidas, filtros, ctx);
    const vazio = GRUPOS_PRAZO.every((g) => grupos[g.chave].length === 0);

    async function alternar(t: TarefaLinha) {
        const status = t.status === "concluida" ? "a_fazer" : "concluida";
        setTarefas((l) => l.map((x) => (x.id === t.id ? { ...x, status } : x)));
        const r = await alterarStatusTarefa({ tarefaId: t.id, status });
        if (r.error) setErro(r.error);
        router.refresh();
    }

    function fecharDialogo() {
        setDialogo(null);
        if (tarefaInicial || tarefaNaoEncontrada) router.replace(`/corretoras/${corretoraId}/tarefas`, { scroll: false });
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1000 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Tarefas</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogo({ tarefa: null })}>Nova tarefa</Button>
            </Stack>
            {erro && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro(null)}>{erro}</Alert>}

            <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: "wrap", alignItems: "center", rowGap: 1.5 }}>
                <ToggleButtonGroup size="small" exclusive value={filtros.visao} onChange={(_e, v: VisaoTarefas | null) => v && setFiltros((f) => ({ ...f, visao: v }))}>
                    {visoes.map((v) => <ToggleButton key={v.valor} value={v.valor}>{v.rotulo}</ToggleButton>)}
                </ToggleButtonGroup>
                <TextField select size="small" label="Prioridade" value={filtros.prioridade} onChange={(e) => setFiltros((f) => ({ ...f, prioridade: e.target.value as Prioridade | "" }))} sx={{ minWidth: 140 }}>
                    <MenuItem value="">Todas</MenuItem>
                    {(Object.keys(LABEL_PRIORIDADE) as Prioridade[]).map((p) => <MenuItem key={p} value={p}>{LABEL_PRIORIDADE[p]}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Registro" value={filtros.tipo} onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value as TipoVinculo | "avulsa" | "" }))} sx={{ minWidth: 150 }}>
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="avulsa">Avulsas</MenuItem>
                    {(Object.keys(LABEL_TIPO_VINCULO) as TipoVinculo[]).map((t) => <MenuItem key={t} value={t}>{LABEL_TIPO_VINCULO[t]}</MenuItem>)}
                </TextField>
                <FormControlLabel control={<Switch checked={mostrarConcluidas} onChange={(e) => setMostrarConcluidas(e.target.checked)} />} label="Concluídas" />
            </Stack>

            <Stack spacing={2}>
                {vazio && <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}><Typography color="text.secondary">Nenhuma tarefa pendente nesse filtro.</Typography></Paper>}
                {GRUPOS_PRAZO.filter((g) => grupos[g.chave].length > 0).map((g) => (
                    <Paper key={g.chave} variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: g.chave === "atrasadas" ? "error.main" : "text.primary" }}>
                            {g.rotulo} ({grupos[g.chave].length})
                        </Typography>
                        <ListaTarefas tarefas={grupos[g.chave]} hoje={hoje} mostrarVinculo onAbrir={(t) => setDialogo({ tarefa: t })} onAlternar={alternar} />
                    </Paper>
                ))}
                {mostrarConcluidas && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Concluídas recentemente ({fechadasFiltradas.length})</Typography>
                        <ListaTarefas tarefas={fechadasFiltradas} hoje={hoje} mostrarVinculo onAbrir={(t) => setDialogo({ tarefa: t })} onAlternar={alternar} vazio="Nenhuma tarefa concluída" />
                    </Paper>
                )}
            </Stack>

            {dialogo && (
                <TarefaDialog
                    corretoraId={corretoraId}
                    tarefa={dialogo.tarefa}
                    vinculoInicial={null}
                    permitirEscolherVinculo
                    onFechar={fecharDialogo}
                    onSalvo={() => { fecharDialogo(); router.refresh(); }}
                />
            )}
        </Box>
    );
}
