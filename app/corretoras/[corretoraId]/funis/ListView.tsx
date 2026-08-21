'use client';
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { Etapa, Negocio } from "./types";
import { formatBRL } from "./constants";
import { corEtapa } from "./KanbanView";
import { initials, avatarColor } from "@/app/ui/design/avatar";

export default function ListView({
    etapas,
    negocios,
    onOpen,
}: {
    etapas: Etapa[];
    negocios: Negocio[];
    onOpen: (id: string) => void;
}) {
    const etapaIndex = new Map(etapas.map((e, i) => [e.id, i]));
    const etapaNome = new Map(etapas.map((e) => [e.id, e.nome]));

    if (negocios.length === 0) {
        return (
            <Box sx={{ flex: 1, display: "grid", placeItems: "center", color: "text.disabled" }}>
                <Box sx={{ textAlign: "center" }}>
                    <InboxOutlinedIcon sx={{ fontSize: 46, opacity: 0.5, mb: 1 }} />
                    <Typography sx={{ fontWeight: 600 }}>Nenhum negócio encontrado</Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 3, pb: 3 }}>
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome do lead</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Etapa</TableCell>
                            <TableCell>Ramo</TableCell>
                            <TableCell align="right">Valor</TableCell>
                            <TableCell>Vendedor</TableCell>
                            <TableCell>Criado em</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {negocios.map((n) => (
                            <TableRow key={n.id} hover onClick={() => onOpen(n.id)} sx={{ cursor: "pointer" }}>
                                <TableCell sx={{ fontWeight: 700 }}>{n.contato.nome}</TableCell>
                                <TableCell sx={{ color: "text.secondary" }}>{n.tipo}</TableCell>
                                <TableCell>
                                    <Chip size="small" label={etapaNome.get(n.etapa_id) ?? "—"} sx={{ bgcolor: `${corEtapa(etapaIndex.get(n.etapa_id) ?? 0)}26`, color: corEtapa(etapaIndex.get(n.etapa_id) ?? 0), fontWeight: 700 }} />
                                </TableCell>
                                <TableCell>{n.ramo}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>{formatBRL(n.valor)}</TableCell>
                                <TableCell>
                                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                                        <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: avatarColor(n.vendedor.nome) }}>{initials(n.vendedor.nome)}</Avatar>
                                        <Typography variant="body2" color="text.secondary">{n.vendedor.nome}</Typography>
                                    </Stack>
                                </TableCell>
                                <TableCell sx={{ color: "text.secondary" }}>{new Date(n.criado_em).toLocaleDateString("pt-BR")}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
