'use client';
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import HistoryIcon from "@mui/icons-material/History";
import { listarHistorico } from "@/app/lib/actions";
import { HistoricoEntry } from "./types";
import { diasDesde, diasLabel } from "./constants";

export default function DealHistoryTab({ negocioId }: { negocioId: string }) {
    const [historico, setHistorico] = useState<HistoricoEntry[]>([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        let ativo = true;
        listarHistorico({ negocioId }).then((r) => {
            if (ativo) {
                setHistorico(r.historico as HistoricoEntry[]);
                setCarregando(false);
            }
        });
        return () => { ativo = false; };
    }, [negocioId]);

    if (carregando) {
        return (
            <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
                <CircularProgress size={22} />
            </Box>
        );
    }

    if (historico.length === 0) {
        return (
            <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", py: 3 }}>
                Nenhuma edição registrada ainda
            </Typography>
        );
    }

    return (
        <Stack spacing={1.75}>
            {historico.map((h) => (
                <Stack key={h.id} direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <HistoryIcon sx={{ fontSize: 18, color: "text.disabled", mt: 0.4 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2">
                            <strong>{h.campo}</strong> alterado
                            {h.valor_anterior ? <> de <em>{h.valor_anterior}</em></> : null}
                            {h.valor_novo ? <> para <em>{h.valor_novo}</em></> : <> (removido)</>}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {h.usuario_nome} · há {diasLabel(diasDesde(h.criado_em))}
                        </Typography>
                    </Box>
                </Stack>
            ))}
        </Stack>
    );
}
