'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import AddIcon from "@mui/icons-material/Add";
import { excluirEquipe, salvarEquipe } from "@/app/lib/actions-equipe";
import { RAMOS_OPCOES } from "@/app/lib/seguros/ramos";
import type { Equipe, Membro } from "./tipos";

type Edicao = { id: string | null; nome: string; ramos: string[]; membros: { usuarioId: string; lider: boolean }[] };

export default function AbaEquipes({ corretoraId, equipes, membros, podeGerenciar }: { corretoraId: string; equipes: Equipe[]; membros: Membro[]; podeGerenciar: boolean }) {
    const router = useRouter();
    const [edicao, setEdicao] = useState<Edicao | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const nome = (id: string) => membros.find((m) => m.usuarioId === id)?.nome ?? "—";

    async function salvar() {
        if (!edicao) return;
        setErro(null);
        const r = await salvarEquipe({ corretoraId, equipeId: edicao.id, nome: edicao.nome, ramos: edicao.ramos, membros: edicao.membros });
        if (r.error) { setErro(r.error); return; }
        setEdicao(null);
        router.refresh();
    }

    return (
        <>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Equipes são opcionais. O líder enxerga a carteira dos membros da equipe.</Typography>
                {podeGerenciar && <Button startIcon={<AddIcon />} variant="outlined" onClick={() => { setErro(null); setEdicao({ id: null, nome: "", ramos: [], membros: [] }); }}>Nova equipe</Button>}
            </Stack>
            {!equipes.length && <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderStyle: "dashed", color: "text.secondary" }}>Nenhuma equipe criada.</Paper>}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 1.5 }}>
                {equipes.map((e) => (
                    <Paper key={e.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography sx={{ fontWeight: 800 }}>{e.nome}</Typography>
                        {e.ramos.length > 0 && <Typography variant="body2" color="text.secondary">{e.ramos.join(", ")}</Typography>}
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", rowGap: 0.5, mt: 1 }}>
                            {e.membros.map((m) => <Chip key={m.usuarioId} size="small" color={m.lider ? "secondary" : "default"} label={`${nome(m.usuarioId)}${m.lider ? " · líder" : ""}`} />)}
                        </Stack>
                        {podeGerenciar && (
                            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                                <Button size="small" onClick={() => { setErro(null); setEdicao({ id: e.id, nome: e.nome, ramos: e.ramos, membros: e.membros }); }}>Editar</Button>
                                <Button size="small" color="error" onClick={async () => { const r = await excluirEquipe({ equipeId: e.id }); if (r.error) setErro(r.error); else router.refresh(); }}>Excluir</Button>
                            </Stack>
                        )}
                    </Paper>
                ))}
            </Box>
            {erro && !edicao && <Alert severity="error" sx={{ mt: 2 }}>{erro}</Alert>}

            <Dialog open={!!edicao} onClose={() => setEdicao(null)} fullWidth maxWidth="sm">
                <DialogTitle>{edicao?.id ? "Editar equipe" : "Nova equipe"}</DialogTitle>
                {edicao && (
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField label="Nome" required value={edicao.nome} onChange={(e) => setEdicao({ ...edicao, nome: e.target.value })} />
                            <Autocomplete multiple options={[...RAMOS_OPCOES]} value={edicao.ramos} onChange={(_e, v) => setEdicao({ ...edicao, ramos: v })}
                                renderInput={(p) => <TextField {...p} label="Ramos que a equipe atende" />} />
                            <Autocomplete multiple options={membros.map((m) => m.usuarioId)} getOptionLabel={nome}
                                value={edicao.membros.map((m) => m.usuarioId)}
                                onChange={(_e, ids) => setEdicao({ ...edicao, membros: ids.map((id) => ({ usuarioId: id, lider: edicao.membros.find((m) => m.usuarioId === id)?.lider ?? false })) })}
                                renderInput={(p) => <TextField {...p} label="Membros" />} />
                            {edicao.membros.map((m) => (
                                <FormControlLabel key={m.usuarioId} label={`${nome(m.usuarioId)} é líder`}
                                    control={<Checkbox checked={m.lider} onChange={(e) => setEdicao({ ...edicao, membros: edicao.membros.map((x) => (x.usuarioId === m.usuarioId ? { ...x, lider: e.target.checked } : x)) })} />} />
                            ))}
                            {erro && <Alert severity="error">{erro}</Alert>}
                        </Stack>
                    </DialogContent>
                )}
                <DialogActions>
                    <Button onClick={() => setEdicao(null)}>Cancelar</Button>
                    <Button variant="contained" onClick={salvar}>Salvar</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
