'use client';
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import { TIPOS, SEGURADORAS } from "./constants";

export type Filtros = {
    cliente: string;
    tipo: string;
    ramo: string;
    seguradora: string;
    criadoDe: string;
};

export const FILTROS_VAZIOS: Filtros = { cliente: "", tipo: "", ramo: "", seguradora: "", criadoDe: "" };

export default function FilterPanel({
    anchorEl,
    onClose,
    filtros,
    onChange,
    onClear,
    ramosAtuacao,
}: {
    anchorEl: HTMLElement | null;
    onClose: () => void;
    filtros: Filtros;
    onChange: (f: Filtros) => void;
    onClear: () => void;
    ramosAtuacao: string[];
}) {
    const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => onChange({ ...filtros, [k]: v });
    const appliedCount = Object.values(filtros).filter(Boolean).length;

    return (
        <Popover
            open={!!anchorEl}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
            <Box sx={{ p: 2.25, width: 420 }}>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14 }}>Filtros avançados</Typography>
                    {appliedCount > 0 && <Typography variant="caption" color="text.secondary">{appliedCount} ativo{appliedCount > 1 ? "s" : ""}</Typography>}
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                    <TextField
                        size="small"
                        label="Procurar clientes"
                        value={filtros.cliente}
                        onChange={(e) => set("cliente", e.target.value)}
                        sx={{ gridColumn: "1 / -1" }}
                    />
                    <TextField size="small" select label="Tipo de seguro" value={filtros.tipo} onChange={(e) => set("tipo", e.target.value)}>
                        <MenuItem value="">Todos os tipos</MenuItem>
                        {TIPOS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </TextField>
                    <TextField size="small" select label="Ramo" value={filtros.ramo} onChange={(e) => set("ramo", e.target.value)}>
                        <MenuItem value="">Todos os ramos</MenuItem>
                        {ramosAtuacao.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </TextField>
                    <TextField size="small" select label="Seguradora" value={filtros.seguradora} onChange={(e) => set("seguradora", e.target.value)}>
                        <MenuItem value="">Todas</MenuItem>
                        {SEGURADORAS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </TextField>
                    <TextField size="small" type="date" label="Criados a partir de" value={filtros.criadoDe} onChange={(e) => set("criadoDe", e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                </Box>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mt: 2, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                    <Button size="small" color="inherit" onClick={onClear}>Limpar filtros</Button>
                    <Typography variant="caption" color="text.secondary">Filtros aplicados em tempo real</Typography>
                </Stack>
            </Box>
        </Popover>
    );
}
