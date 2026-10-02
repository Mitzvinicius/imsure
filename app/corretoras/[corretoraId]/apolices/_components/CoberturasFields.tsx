'use client';
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { parseValorBR } from "@/app/lib/seguros/datas";
import type { CoberturaForm } from "@/app/lib/seguros/types";

const num = (n: number | null) => (n != null ? String(n).replace(".", ",") : "");

export default function CoberturasFields({ coberturas, onChange }: { coberturas: CoberturaForm[]; onChange: (c: CoberturaForm[]) => void }) {
    const set = (i: number, p: Partial<CoberturaForm>) => onChange(coberturas.map((c, j) => (j === i ? { ...c, ...p } : c)));
    return (
        <Stack spacing={1.5}>
            {coberturas.map((c, i) => (
                <Stack key={i} direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: "center" }}>
                    <TextField size="small" label="Cobertura" required value={c.nome} onChange={(e) => set(i, { nome: e.target.value })} sx={{ flex: 2 }} />
                    <TextField size="small" label="Importância segurada (R$)" value={num(c.importancia_segurada)} onChange={(e) => set(i, { importancia_segurada: parseValorBR(e.target.value) })} sx={{ flex: 1 }} />
                    <TextField size="small" label="Franquia (R$)" value={num(c.franquia)} onChange={(e) => set(i, { franquia: parseValorBR(e.target.value) })} sx={{ flex: 1 }} />
                    <IconButton size="small" aria-label="Remover cobertura" onClick={() => onChange(coberturas.filter((_, j) => j !== i))}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Stack>
            ))}
            <Button size="small" startIcon={<AddIcon />} sx={{ alignSelf: "flex-start" }} onClick={() => onChange([...coberturas, { nome: "", importancia_segurada: null, franquia: null }])}>
                Adicionar cobertura
            </Button>
        </Stack>
    );
}
