'use client';
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { criarAnotacao, deletarAnotacao, listarAnotacoes } from "@/app/lib/actions";
import { Anotacao } from "./types";
import { initials, avatarColor } from "@/app/ui/design/avatar";

export default function DealNotesTab({ negocioId }: { negocioId: string }) {
    const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [texto, setTexto] = useState("");
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        let ativo = true;
        listarAnotacoes({ negocioId }).then((r) => {
            if (ativo) {
                setAnotacoes(r.anotacoes as Anotacao[]);
                setCarregando(false);
            }
        });
        return () => { ativo = false; };
    }, [negocioId]);

    async function adicionar() {
        if (!texto.trim()) return;
        setSalvando(true);
        const r = await criarAnotacao({ negocioId, texto });
        setSalvando(false);
        if (!r.error) {
            setTexto("");
            const atualizado = await listarAnotacoes({ negocioId });
            setAnotacoes(atualizado.anotacoes as Anotacao[]);
        }
    }

    async function excluir(anotacaoId: string) {
        setAnotacoes((prev) => prev.filter((a) => a.id !== anotacaoId));
        await deletarAnotacao({ anotacaoId });
    }

    return (
        <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5}>
                <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Escreva uma anotação sobre esse negócio..."
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                />
                <Button variant="contained" disabled={salvando || !texto.trim()} onClick={adicionar} sx={{ alignSelf: "flex-end" }}>
                    Adicionar
                </Button>
            </Stack>

            {carregando ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
                    <CircularProgress size={22} />
                </Box>
            ) : anotacoes.length === 0 ? (
                <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", py: 3 }}>
                    Nenhuma anotação ainda
                </Typography>
            ) : (
                <Stack spacing={1.75}>
                    {anotacoes.map((a) => (
                        <Stack key={a.id} direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                            <Avatar sx={{ width: 30, height: 30, fontSize: 12.5, bgcolor: avatarColor(a.usuario_nome) }}>
                                {initials(a.usuario_nome)}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{a.usuario_nome}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {new Date(a.criado_em).toLocaleString("pt-BR")}
                                    </Typography>
                                </Stack>
                                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.25 }}>{a.texto}</Typography>
                            </Box>
                            <IconButton size="small" onClick={() => excluir(a.id)} title="Excluir anotação">
                                <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    ))}
                </Stack>
            )}
        </Stack>
    );
}
