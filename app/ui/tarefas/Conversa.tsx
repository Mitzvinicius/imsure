'use client';
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { comentar, editarComentario, excluirComentario, listarComentarios } from "@/app/lib/actions-tarefas";
import { extrairMencoes, segmentarMencoes } from "@/app/lib/tarefas/regras";
import type { Alvo, ComentarioLinha, Membro } from "@/app/lib/tarefas/tipos";
import { usePermissoes } from "@/app/ui/design/PermissoesContext";
import { initials, avatarColor } from "@/app/ui/design/avatar";
import CampoMencao from "./CampoMencao";

export default function Conversa({ corretoraId, alvo, membros }: { corretoraId: string; alvo: Alvo; membros: Membro[] }) {
    const { usuarioId } = usePermissoes();
    const { tipo, id } = alvo;
    const [comentarios, setComentarios] = useState<ComentarioLinha[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [texto, setTexto] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
    const nomes = membros.map((m) => m.nome);

    useEffect(() => {
        let ativo = true;
        listarComentarios({ alvo: { tipo, id } }).then((r) => {
            if (!ativo) return;
            setComentarios(r.comentarios);
            setErro(r.error);
            setCarregando(false);
        });
        return () => { ativo = false; };
    }, [tipo, id]);

    async function recarregar() {
        const r = await listarComentarios({ alvo: { tipo, id } });
        setComentarios(r.comentarios);
    }

    async function enviar() {
        if (!texto.trim()) return;
        setSalvando(true);
        setErro(null);
        const r = await comentar({ corretoraId, alvo: { tipo, id }, texto, mencoes: extrairMencoes(texto, membros) });
        setSalvando(false);
        if (r.error) { setErro(r.error); return; }
        setTexto("");
        await recarregar();
    }

    async function salvarEdicao() {
        if (!editando) return;
        const r = await editarComentario({ comentarioId: editando.id, texto: editando.texto });
        if (r.error) { setErro(r.error); return; }
        setEditando(null);
        await recarregar();
    }

    async function excluir(comentarioId: string) {
        setComentarios((l) => l.filter((c) => c.id !== comentarioId));
        const r = await excluirComentario({ comentarioId });
        if (r.error) { setErro(r.error); await recarregar(); }
    }

    return (
        <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                <CampoMencao valor={texto} onValor={setTexto} membros={membros} placeholder="Escreva para a equipe..." disabled={salvando} />
                <Button variant="contained" disabled={salvando || !texto.trim()} onClick={enviar} sx={{ mt: 1 }}>Enviar</Button>
            </Stack>
            {erro && <Alert severity="error" onClose={() => setErro(null)}>{erro}</Alert>}

            {carregando ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 3 }}><CircularProgress size={22} /></Box>
            ) : comentarios.length === 0 ? (
                <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", py: 2 }}>Nenhuma conversa ainda</Typography>
            ) : (
                <Stack spacing={1.75}>
                    {comentarios.map((c) => (
                        <Stack key={c.id} direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                            <Avatar sx={{ width: 30, height: 30, fontSize: 12.5, bgcolor: avatarColor(c.autor.nome) }}>{initials(c.autor.nome)}</Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{c.autor.nome}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {new Date(c.criado_em).toLocaleString("pt-BR")}{c.editado_em ? " · editado" : ""}
                                    </Typography>
                                </Stack>
                                {editando?.id === c.id ? (
                                    <Stack spacing={1} sx={{ mt: 0.5 }}>
                                        <TextField fullWidth multiline minRows={2} value={editando.texto} onChange={(e) => setEditando({ id: c.id, texto: e.target.value })} />
                                        <Stack direction="row" spacing={1}>
                                            <Button size="small" variant="contained" onClick={salvarEdicao}>Salvar</Button>
                                            <Button size="small" onClick={() => setEditando(null)}>Cancelar</Button>
                                        </Stack>
                                    </Stack>
                                ) : (
                                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.25 }}>
                                        {segmentarMencoes(c.texto, nomes).map((p, i) => p.mencao
                                            ? <Box key={i} component="span" sx={{ color: "primary.main", fontWeight: 700 }}>{p.texto}</Box>
                                            : <span key={i}>{p.texto}</span>)}
                                    </Typography>
                                )}
                            </Box>
                            {c.autor.id === usuarioId && editando?.id !== c.id && (
                                <Stack direction="row">
                                    <IconButton size="small" title="Editar" onClick={() => setEditando({ id: c.id, texto: c.texto })}><EditOutlinedIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" title="Excluir" onClick={() => excluir(c.id)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                                </Stack>
                            )}
                        </Stack>
                    ))}
                </Stack>
            )}
        </Stack>
    );
}
