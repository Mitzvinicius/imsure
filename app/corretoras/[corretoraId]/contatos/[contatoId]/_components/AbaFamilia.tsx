'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Autocomplete from "@mui/material/Autocomplete";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { buscarContatos } from "@/app/lib/actions";
import { adicionarVinculo, removerVinculo } from "@/app/lib/actions-contatos";
import { LABEL_PARENTESCO, PARENTESCOS, validarNovoParente, type Parentesco, type ParenteDoContato } from "@/app/lib/contatos/parentesco";
import { initials, avatarColor } from "@/app/ui/design/avatar";
import { formatTelefone } from "../../../funis/masks";
import type { ContatoFicha } from "../tipos";

type Opcao = { id: string; nome: string; telefone: string | null; email: string | null };

export default function AbaFamilia({ corretoraId, contato, parentes }: { corretoraId: string; contato: ContatoFicha; parentes: ParenteDoContato[] }) {
    const router = useRouter();
    const [dialogo, setDialogo] = useState(false);
    const [parentesco, setParentesco] = useState<Parentesco | "">("");
    const [modo, setModo] = useState<"existente" | "novo">("existente");
    const [escolhido, setEscolhido] = useState<Opcao | null>(null);
    const [termo, setTermo] = useState("");
    const [opcoes, setOpcoes] = useState<Opcao[]>([]);
    const [novo, setNovo] = useState({ nome: "", telefone: "", email: "" });
    const [erroVinculo, setErroVinculo] = useState<string | null>(null);
    const [erroLista, setErroLista] = useState<string | null>(null);
    const jaVinculados = new Set([contato.id, ...parentes.map((p) => p.pessoa.id)]);

    useEffect(() => {
        if (termo.trim().length < 2) return;
        const t = setTimeout(async () => {
            const r = await buscarContatos({ corretoraId, query: termo.trim() });
            setOpcoes((r.contatos ?? []).map((c) => ({ id: c.id, nome: c.nome, telefone: c.telefone, email: c.email })));
        }, 250);
        return () => clearTimeout(t);
    }, [termo, corretoraId]);

    function abrirDialogo() {
        setParentesco(""); setModo("existente"); setEscolhido(null); setTermo(""); setOpcoes([]);
        setNovo({ nome: "", telefone: "", email: "" }); setErroVinculo(null); setDialogo(true);
    }

    async function salvarVinculo() {
        setErroVinculo(null);
        if (!parentesco) { setErroVinculo("Escolha o grau de parentesco."); return; }
        if (modo === "existente" && !escolhido) { setErroVinculo("Escolha um contato."); return; }
        if (modo === "novo") {
            const e = validarNovoParente(novo);
            if (e) { setErroVinculo(e); return; }
        }
        const r = await adicionarVinculo({
            corretoraId,
            contatoId: contato.id,
            parentesco,
            parenteId: modo === "existente" ? escolhido!.id : null,
            novoParente: modo === "novo" ? novo : null,
        });
        if (r.error) { setErroVinculo(r.error); return; }
        setDialogo(false);
        router.refresh();
    }

    async function remover(vinculoId: string) {
        setErroLista(null);
        const r = await removerVinculo({ vinculoId });
        if (r.error) setErroLista(r.error); else router.refresh();
    }

    return (
        <>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800 }}>Parentes</Typography>
                    <Typography variant="body2" color="text.secondary">Cônjuge, filhos e parentes até 2º grau</Typography>
                </Box>
                <Button startIcon={<AddIcon />} variant="outlined" onClick={abrirDialogo}>Adicionar parente</Button>
            </Stack>

            {erroLista && <Alert severity="error" sx={{ mb: 2 }}>{erroLista}</Alert>}
            {!parentes.length && (
                <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderStyle: "dashed", color: "text.secondary" }}>
                    Nenhum parente cadastrado.
                </Paper>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 1.5 }}>
                {parentes.map((p) => (
                    <Paper key={p.vinculoId} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <Avatar sx={{ bgcolor: avatarColor(p.pessoa.nome) }}>{initials(p.pessoa.nome)}</Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Link component={NextLink} href={`/corretoras/${corretoraId}/contatos/${p.pessoa.id}?aba=familia`} sx={{ fontWeight: 700, display: "block" }} noWrap>
                                    {p.pessoa.nome}
                                </Link>
                                <Chip size="small" label={LABEL_PARENTESCO[p.parentesco]} sx={{ mt: 0.5 }} />
                            </Box>
                            <IconButton size="small" aria-label="Remover vínculo" onClick={() => remover(p.vinculoId)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                        </Stack>
                        {(p.pessoa.telefone || p.pessoa.email) && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} noWrap>
                                {[p.pessoa.telefone, p.pessoa.email].filter(Boolean).join(" · ")}
                            </Typography>
                        )}
                    </Paper>
                ))}
            </Box>

            <Dialog open={dialogo} onClose={() => setDialogo(false)} fullWidth maxWidth="sm">
                <DialogTitle>Adicionar parente de {contato.nome}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField select label="Grau de parentesco" required value={parentesco} onChange={(e) => setParentesco(e.target.value as Parentesco)}
                            helperText={parentesco ? `${LABEL_PARENTESCO[parentesco]} de ${contato.nome}` : " "}>
                            {PARENTESCOS.map((p) => <MenuItem key={p} value={p}>{LABEL_PARENTESCO[p]}</MenuItem>)}
                        </TextField>
                        <ToggleButtonGroup size="small" exclusive value={modo} onChange={(_e, v) => v && setModo(v)}>
                            <ToggleButton value="existente">Contato existente</ToggleButton>
                            <ToggleButton value="novo">Cadastrar novo</ToggleButton>
                        </ToggleButtonGroup>
                        {modo === "existente" ? (
                            <Autocomplete
                                options={opcoes.filter((o) => !jaVinculados.has(o.id))}
                                value={escolhido}
                                getOptionLabel={(o) => o.nome}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                filterOptions={(x) => x}
                                onInputChange={(_e, v) => setTermo(v)}
                                onChange={(_e, v) => setEscolhido(v)}
                                noOptionsText={termo.trim().length < 2 ? "Digite ao menos 2 letras" : "Nenhum contato encontrado"}
                                renderInput={(p) => <TextField {...p} label="Buscar contato" />}
                            />
                        ) : (
                            <Stack spacing={1.5}>
                                <TextField label="Nome" required value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
                                <TextField label="Telefone" value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: formatTelefone(e.target.value) })} slotProps={{ htmlInput: { inputMode: "numeric" } }} />
                                <TextField label="E-mail" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} helperText="Informe telefone ou e-mail" />
                            </Stack>
                        )}
                        {erroVinculo && <Alert severity="error">{erroVinculo}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogo(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={salvarVinculo}>Adicionar</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
