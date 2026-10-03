'use client';
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CheckIcon from "@mui/icons-material/Check";
import { LABEL_ESCOPO, PERMISSOES } from "@/app/lib/equipe/permissoes";
import type { Cargo } from "./tipos";

export default function AbaCargos({ cargos }: { cargos: Cargo[] }) {
    return (
        <>
            <Alert severity="info" sx={{ mb: 2 }}>Cargos personalizados chegam em breve nos planos Pro e Business.</Alert>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 1.5 }}>
                {cargos.map((c) => (
                    <Paper key={c.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography sx={{ fontWeight: 800 }}>{c.nome}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{LABEL_ESCOPO[c.escopo]}</Typography>
                        {PERMISSOES.filter((p) => c.permissoes.includes(p.chave)).map((p) => (
                            <Typography key={p.chave} variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                <CheckIcon fontSize="inherit" color="success" /> {p.descricao}
                            </Typography>
                        ))}
                        {!c.permissoes.length && <Typography variant="body2" color="text.secondary">Cria e edita a própria carteira.</Typography>}
                    </Paper>
                ))}
            </Box>
        </>
    );
}
