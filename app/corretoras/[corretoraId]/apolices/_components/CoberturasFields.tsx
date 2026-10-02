'use client';
import { CampoMoeda } from "@/app/ui/design/CamposMascarados";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import type { CoberturaForm } from "@/app/lib/seguros/types";

export default function CoberturasFields({ coberturas, onChange }: { coberturas: CoberturaForm[]; onChange: (c: CoberturaForm[]) => void }) {
    const set = (i: number, p: Partial<CoberturaForm>) => onChange(coberturas.map((c, j) => (j === i ? { ...c, ...p } : c)));
    return (
        <Stack spacing={1.5}>
            {coberturas.map((c, i) => (
                <Stack key={i} direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: "center" }}>
                    <TextField size="small" label="Cobertura" required value={c.nome} onChange={(e) => set(i, { nome: e.target.value })} sx={{ flex: 2 }} />
                    <CampoMoeda size="small" label="Importância segurada" valor={c.importancia_segurada} onValor={(v) => set(i, { importancia_segurada: v })} sx={{ flex: 1 }} />
                    <CampoMoeda size="small" label="Franquia" valor={c.franquia} onValor={(v) => set(i, { franquia: v })} sx={{ flex: 1 }} />
                    <IconButton size="small" aria-label="Remover cobertura" onClick={() => onChange(coberturas.filter((_, j) => j !== i))}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Stack>
            ))}
            <Button size="small" startIcon={<AddIcon />} sx={{ alignSelf: "flex-start" }} onClick={() => onChange([...coberturas, { nome: "", importancia_segurada: null, franquia: null }])}>
                Adicionar cobertura
            </Button>
        </Stack>
    );
}
