'use client';
import { CampoPercentual } from "@/app/ui/design/CamposMascarados";
import { formatCpf } from "../../funis/masks";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { validarPercentuaisBeneficiarios } from "@/app/lib/seguros/validacao";
import type { VidaSeguradaForm } from "@/app/lib/seguros/types";

const VIDA_VAZIA: VidaSeguradaForm = { nome: "", cpf: "", data_nascimento: null, beneficiarios: [] };

export default function VidasFields({ itens, onChange }: { itens: VidaSeguradaForm[]; onChange: (v: VidaSeguradaForm[]) => void }) {
    const atualizar = (i: number, v: Partial<VidaSeguradaForm>) => onChange(itens.map((x, j) => (j === i ? { ...x, ...v } : x)));

    return (
        <Stack spacing={2}>
            {itens.map((vida, i) => {
                const erro = validarPercentuaisBeneficiarios(vida.beneficiarios.map((b) => b.percentual));
                return (
                    <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={1.5}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: "center" }}>
                                <TextField label="Nome do segurado" required value={vida.nome} onChange={(e) => atualizar(i, { nome: e.target.value })} sx={{ flex: 2 }} />
                                <TextField label="CPF" value={formatCpf(vida.cpf)} onChange={(e) => atualizar(i, { cpf: e.target.value.replace(/\D/g, "").slice(0, 11) })} slotProps={{ htmlInput: { inputMode: "numeric" } }} sx={{ flex: 1 }} />
                                <TextField label="Nascimento" type="date" value={vida.data_nascimento ?? ""} onChange={(e) => atualizar(i, { data_nascimento: e.target.value || null })} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                                <IconButton aria-label="Remover vida" onClick={() => onChange(itens.filter((_, j) => j !== i))}><DeleteOutlineIcon /></IconButton>
                            </Stack>
                            <Typography variant="subtitle2">Beneficiários</Typography>
                            {vida.beneficiarios.map((b, k) => (
                                <Stack key={k} direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: "center" }}>
                                    <TextField size="small" label="Nome" value={b.nome} onChange={(e) => atualizar(i, { beneficiarios: vida.beneficiarios.map((x, y) => (y === k ? { ...x, nome: e.target.value } : x)) })} sx={{ flex: 2 }} />
                                    <TextField size="small" label="Parentesco" value={b.parentesco} onChange={(e) => atualizar(i, { beneficiarios: vida.beneficiarios.map((x, y) => (y === k ? { ...x, parentesco: e.target.value } : x)) })} sx={{ flex: 1 }} />
                                    <CampoPercentual size="small" label="Percentual" valor={b.percentual || null} onValor={(v) => atualizar(i, { beneficiarios: vida.beneficiarios.map((x, y) => (y === k ? { ...x, percentual: v ?? 0 } : x)) })} sx={{ width: 140 }} />
                                    <IconButton size="small" aria-label="Remover beneficiário" onClick={() => atualizar(i, { beneficiarios: vida.beneficiarios.filter((_, y) => y !== k) })}><DeleteOutlineIcon fontSize="small" /></IconButton>
                                </Stack>
                            ))}
                            {erro && vida.beneficiarios.length > 0 && <Alert severity="warning">{erro}</Alert>}
                            <Button size="small" startIcon={<AddIcon />} sx={{ alignSelf: "flex-start" }} onClick={() => atualizar(i, { beneficiarios: [...vida.beneficiarios, { nome: "", parentesco: "", percentual: 0 }] })}>
                                Adicionar beneficiário
                            </Button>
                        </Stack>
                    </Paper>
                );
            })}
            <Button startIcon={<AddIcon />} sx={{ alignSelf: "flex-start" }} onClick={() => onChange([...itens, VIDA_VAZIA])}>Adicionar vida segurada</Button>
        </Stack>
    );
}
