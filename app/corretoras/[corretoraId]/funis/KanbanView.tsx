'use client';
import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DealCard from "./DealCard";
import { Etapa, Negocio } from "./types";
import { formatBRL } from "./constants";

const CORES_ETAPA = ["#2563eb", "#c98a00", "#7c3aed", "#0d9488", "#e11d48", "#0891b2"];

export function corEtapa(index: number) {
    return CORES_ETAPA[index % CORES_ETAPA.length];
}

export default function KanbanView({
    etapas,
    negocios,
    onOpen,
    onMove,
}: {
    etapas: Etapa[];
    negocios: Negocio[];
    onOpen: (id: string) => void;
    onMove: (negocioId: string, etapaId: string) => void;
}) {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<string | null>(null);

    return (
        <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", px: 3, pb: 2 }}>
            <Stack direction="row" spacing={2} sx={{ height: "100%", overflowX: "auto", pb: 1.5 }}>
                {etapas.map((etapa, i) => {
                    const deals = negocios.filter((n) => n.etapa_id === etapa.id);
                    const total = deals.reduce((s, d) => s + Number(d.valor || 0), 0);
                    const cor = corEtapa(i);
                    const isTarget = dropTarget === etapa.id;

                    return (
                        <Box
                            key={etapa.id}
                            onDragOver={(e) => { e.preventDefault(); setDropTarget(etapa.id); }}
                            onDragLeave={() => setDropTarget((t) => (t === etapa.id ? null : t))}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (draggingId) onMove(draggingId, etapa.id);
                                setDraggingId(null);
                                setDropTarget(null);
                            }}
                            sx={{
                                flex: "1 1 0",
                                minWidth: 290,
                                maxWidth: 420,
                                display: "flex",
                                flexDirection: "column",
                                bgcolor: isTarget ? "action.hover" : "background.default",
                                border: "1px solid",
                                borderColor: isTarget ? cor : "divider",
                                borderRadius: 3,
                            }}
                        >
                            <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                    <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: cor }} />
                                    <Typography sx={{ fontWeight: 800, fontSize: 14.5 }}>{etapa.nome}</Typography>
                                    <Box sx={{ ml: "auto", minWidth: 24, height: 22, px: 1, borderRadius: 99, bgcolor: `${cor}26`, color: cor, fontSize: 12.5, fontWeight: 800, display: "grid", placeItems: "center" }}>
                                        {deals.length}
                                    </Box>
                                </Stack>
                                <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline", mt: 1 }}>
                                    <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{formatBRL(total)}</Typography>
                                    <Typography variant="caption" color="text.secondary">em prêmio total</Typography>
                                </Stack>
                            </Box>
                            <Stack spacing={1.25} sx={{ p: 1.5, overflowY: "auto", flex: 1 }}>
                                {deals.map((d) => (
                                    <DealCard
                                        key={d.id}
                                        negocio={d}
                                        stageColor={cor}
                                        onOpen={() => onOpen(d.id)}
                                        onDragStart={() => setDraggingId(d.id)}
                                    />
                                ))}
                                {deals.length === 0 && (
                                    <Box sx={{ m: 0.5, p: 3, border: "1.5px dashed", borderColor: "divider", borderRadius: 2, textAlign: "center", color: "text.disabled", fontSize: 12.5, fontWeight: 600 }}>
                                        Nenhum negócio aqui ainda
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    );
                })}
            </Stack>
        </Box>
    );
}
