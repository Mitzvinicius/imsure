'use client';
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { Negocio } from "./types";
import { formatBRL, diasDesde, diasLabel } from "./constants";
import { initials, avatarColor } from "@/app/ui/design/avatar";

export default function DealCard({
    negocio,
    stageColor,
    onOpen,
    onDragStart,
}: {
    negocio: Negocio;
    stageColor: string;
    onOpen: () => void;
    onDragStart: (e: React.DragEvent) => void;
}) {
    const dias = diasDesde(negocio.criado_em);

    return (
        <Box
            draggable
            onDragStart={onDragStart}
            onClick={onOpen}
            sx={{
                position: "relative",
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 1.5,
                pl: 2,
                cursor: "grab",
                overflow: "hidden",
                transition: "box-shadow .15s, transform .1s",
                "&:hover": { boxShadow: 3, transform: "translateY(-1px)" },
                "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    bgcolor: stageColor,
                },
            }}
        >
            <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{negocio.contato.nome}</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 14.5, whiteSpace: "nowrap" }}>{formatBRL(negocio.valor)}</Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75, mt: 1 }}>
                <Chip size="small" label={negocio.tipo} variant="outlined" sx={{ fontSize: 11 }} />
                <Chip size="small" label={negocio.ramo} sx={{ fontSize: 11, bgcolor: "action.hover" }} />
                {negocio.indicacao && <Chip size="small" color="secondary" label="Indicação" sx={{ fontSize: 11 }} />}
            </Stack>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mt: 1.25, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", minWidth: 0 }}>
                    <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: avatarColor(negocio.vendedor.nome) }}>
                        {initials(negocio.vendedor.nome)}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary" noWrap>{negocio.vendedor.nome}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary", flexShrink: 0 }}>
                    <AccessTimeIcon sx={{ fontSize: 13 }} />
                    <Typography variant="caption">{diasLabel(dias)}</Typography>
                </Stack>
            </Stack>
        </Box>
    );
}
