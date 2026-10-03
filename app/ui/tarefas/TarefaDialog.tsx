'use client';
import { useEffect, useState } from "react";
import Link from "next/link";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { atualizarTarefa, criarTarefa, excluirTarefa, membrosQueVeem } from "@/app/lib/actions-tarefas";
import { LABEL_PRIORIDADE, LABEL_STATUS_TAREFA, grupoPrazo, linkAlvo, validarTarefa } from "@/app/lib/tarefas/regras";
import type { Alvo, DadosTarefa, Membro, Prioridade, RegistroBusca, StatusTarefa, TarefaLinha, Vinculo } from "@/app/lib/tarefas/tipos";
import { hojeSaoPaulo } from "@/app/lib/seguros/datas";
import { usePermissoes } from "@/app/ui/design/PermissoesContext";
import Conversa from "./Conversa";
import SeletorRegistro from "./SeletorRegistro";

function dadosIniciais(tarefa: TarefaLinha | null, usuarioId: string): DadosTarefa {
    if (!tarefa) return { titulo: "", descricao: "", responsavelId: usuarioId, prazo: null, prazoHora: null, prioridade: "media", status: "a_fazer" };
    return {
        titulo: tarefa.titulo, descricao: tarefa.descricao ?? "", responsavelId: tarefa.responsavel.id,
        prazo: tarefa.prazo, prazoHora: tarefa.prazo_hora?.slice(0, 5) ?? null, prioridade: tarefa.prioridade, status: tarefa.status,
    };
}

export default function TarefaDialog({ corretoraId, tarefa, vinculoInicial, permitirEscolherVinculo, onFechar, onSalvo }: {
    corretoraId: string;
    tarefa: TarefaLinha | null;
    vinculoInicial: Vinculo | null;
    permitirEscolherVinculo: boolean;
    onFechar: () => void;
    onSalvo: () => void;
}) {
    const { usuarioId, escopo } = usePermissoes();
    const nova = !tarefa;
    const podeEditar = !tarefa || tarefa.responsavel.id === usuarioId || tarefa.criador.id === usuarioId || escopo === "tudo";
    const podeExcluir = !!tarefa && (tarefa.criador.id === usuarioId || escopo === "tudo");

    const [dados, setDados] = useState<DadosTarefa>(() => dadosIniciais(tarefa, usuarioId));
    const [registro, setRegistro] = useState<RegistroBusca | null>(null);
    const [membros, setMembros] = useState<Membro[]>([]);
    const [membrosTarefa, setMembrosTarefa] = useState<Membro[]>([]);
    const [erro, setErro] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);
    const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
    const set = (p: Partial<DadosTarefa>) => setDados((d) => ({ ...d, ...p }));
    const hoje = hojeSaoPaulo();

    const vinculo: Vinculo | null = tarefa ? tarefa.vinculo : registro ? { tipo: registro.tipo, id: registro.id } : vinculoInicial;
    const vTipo = vinculo?.tipo ?? null;
    const vId = vinculo?.id ?? null;

    useEffect(() => {
        let ativo = true;
        const alvo: Alvo | null = vTipo && vId ? { tipo: vTipo, id: vId } : null;
        membrosQueVeem({ corretoraId, alvo }).then((r) => {
            if (!ativo) return;
            setMembros(r.membros);
            // tarefa nova: se o responsável escolhido não enxerga o registro novo, volta para quem está criando
            if (nova) setDados((d) => (r.membros.some((m) => m.id === d.responsavelId) ? d : { ...d, responsavelId: usuarioId }));
        });
        return () => { ativo = false; };
    }, [corretoraId, vTipo, vId, usuarioId, nova]);

    const tarefaId = tarefa?.id ?? null;
    useEffect(() => {
        if (!tarefaId) return;
        let ativo = true;
        membrosQueVeem({ corretoraId, alvo: { tipo: "tarefa", id: tarefaId } }).then((r) => { if (ativo) setMembrosTarefa(r.membros); });
        return () => { ativo = false; };
    }, [corretoraId, tarefaId]);

    // responsável atual pode estar desativado/sem acesso: continua aparecendo para não trocar sem querer
    const opcoesResponsavel = tarefa && !membros.some((m) => m.id === tarefa.responsavel.id)
        ? [...membros, { id: tarefa.responsavel.id, nome: `${tarefa.responsavel.nome} (sem acesso)` }]
        : membros;

    async function salvar() {
        const invalido = validarTarefa(dados);
        if (invalido) { setErro(invalido); return; }
        setSalvando(true);
        setErro(null);
        const r = tarefa ? await atualizarTarefa({ tarefaId: tarefa.id, dados }) : await criarTarefa({ corretoraId, dados, vinculo });
        setSalvando(false);
        if (r.error) { setErro(r.error); return; }
        onSalvo();
    }

    async function excluir() {
        if (!tarefa) return;
        const r = await excluirTarefa({ tarefaId: tarefa.id });
        if (r.error) { setErro(r.error); return; }
        onSalvo();
    }

    return (
        <Dialog open onClose={onFechar} fullWidth maxWidth="sm">
            <DialogTitle>{nova ? "Nova tarefa" : "Tarefa"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    {erro && <Alert severity="error">{erro}</Alert>}
                    <TextField label="Título" value={dados.titulo} onChange={(e) => set({ titulo: e.target.value })} disabled={!podeEditar} autoFocus={nova} slotProps={{ htmlInput: { maxLength: 200 } }} />
                    <TextField label="Descrição" multiline minRows={2} value={dados.descricao} onChange={(e) => set({ descricao: e.target.value })} disabled={!podeEditar} />
                    {nova && permitirEscolherVinculo && <SeletorRegistro corretoraId={corretoraId} valor={registro} onValor={setRegistro} />}
                    {tarefa?.vinculo && (
                        <Button component={Link} href={linkAlvo(corretoraId, tarefa.vinculo)} startIcon={<OpenInNewIcon />} sx={{ alignSelf: "flex-start" }}>
                            {tarefa.rotuloVinculo ?? "Abrir registro"}
                        </Button>
                    )}
                    <TextField select label="Responsável" value={opcoesResponsavel.some((m) => m.id === dados.responsavelId) ? dados.responsavelId : ""} onChange={(e) => set({ responsavelId: e.target.value })} disabled={!podeEditar}
                        helperText={vinculo ? "Só aparece quem tem acesso a este registro" : undefined}>
                        {opcoesResponsavel.map((m) => <MenuItem key={m.id} value={m.id}>{m.id === usuarioId ? `${m.nome} (você)` : m.nome}</MenuItem>)}
                    </TextField>
                    <Stack direction="row" spacing={1.5}>
                        <TextField label="Prazo" type="date" value={dados.prazo ?? ""} onChange={(e) => set({ prazo: e.target.value || null, prazoHora: e.target.value ? dados.prazoHora : null })} disabled={!podeEditar} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                        <TextField label="Hora" type="time" value={dados.prazoHora ?? ""} onChange={(e) => set({ prazoHora: e.target.value || null })} disabled={!podeEditar || !dados.prazo} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 130 }} />
                    </Stack>
                    {dados.prazo && grupoPrazo(dados.prazo, hoje) === "atrasadas" && tarefa?.prazo !== dados.prazo && (
                        <Alert severity="warning">Esse prazo já passou: a tarefa vai aparecer como atrasada.</Alert>
                    )}
                    <Stack direction="row" spacing={1.5}>
                        <TextField select label="Prioridade" value={dados.prioridade} onChange={(e) => set({ prioridade: e.target.value as Prioridade })} disabled={!podeEditar} sx={{ flex: 1 }}>
                            {(Object.keys(LABEL_PRIORIDADE) as Prioridade[]).map((p) => <MenuItem key={p} value={p}>{LABEL_PRIORIDADE[p]}</MenuItem>)}
                        </TextField>
                        {!nova && (
                            <TextField select label="Status" value={dados.status} onChange={(e) => set({ status: e.target.value as StatusTarefa })} disabled={!podeEditar} sx={{ flex: 1 }}>
                                {(Object.keys(LABEL_STATUS_TAREFA) as StatusTarefa[]).map((s) => <MenuItem key={s} value={s}>{LABEL_STATUS_TAREFA[s]}</MenuItem>)}
                            </TextField>
                        )}
                    </Stack>
                    {tarefa && (
                        <Typography variant="caption" color="text.secondary">
                            Criada por {tarefa.criador.nome} em {new Date(tarefa.criado_em).toLocaleDateString("pt-BR")}
                        </Typography>
                    )}
                    {tarefa && (
                        <>
                            <Divider />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Comentários</Typography>
                            <Conversa corretoraId={corretoraId} alvo={{ tipo: "tarefa", id: tarefa.id }} membros={membrosTarefa} />
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
                <span>
                    {podeExcluir && (confirmandoExclusao
                        ? <><Button color="error" onClick={excluir}>Confirmar exclusão</Button><Button onClick={() => setConfirmandoExclusao(false)}>Cancelar</Button></>
                        : <Button color="error" onClick={() => setConfirmandoExclusao(true)}>Excluir</Button>)}
                </span>
                <span>
                    <Button onClick={onFechar}>Fechar</Button>
                    {podeEditar && <Button variant="contained" onClick={salvar} disabled={salvando} sx={{ ml: 1 }}>{nova ? "Criar tarefa" : "Salvar"}</Button>}
                </span>
            </DialogActions>
        </Dialog>
    );
}
