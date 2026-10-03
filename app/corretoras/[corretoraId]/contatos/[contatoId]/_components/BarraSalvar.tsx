'use client';
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import SaveIcon from "@mui/icons-material/Save";

export type EstadoSalvar = { salvando: boolean; erro: string | null; salvo: boolean; onSalvar: () => void };

export default function BarraSalvar({ salvando, erro, salvo, onSalvar, desabilitado = false }: EstadoSalvar & { desabilitado?: boolean }) {
    return (
        <Stack spacing={1.5} sx={{ mt: 3 }}>
            {erro && <Alert severity="error">{erro}</Alert>}
            {salvo && <Alert severity="success">Alterações salvas.</Alert>}
            <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                <Button variant="contained" startIcon={<SaveIcon />} disabled={salvando || desabilitado} onClick={onSalvar}>
                    {salvando ? "Salvando..." : "Salvar"}
                </Button>
            </Stack>
        </Stack>
    );
}
