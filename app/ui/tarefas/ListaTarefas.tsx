'use client';
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import { COR_PRIORIDADE, LABEL_PRIORIDADE, grupoPrazo, tarefaAberta, textoPrazo } from "@/app/lib/tarefas/regras";
import type { TarefaLinha } from "@/app/lib/tarefas/tipos";
import { initials, avatarColor } from "@/app/ui/design/avatar";

export default function ListaTarefas({ tarefas, hoje, onAbrir, onAlternar, mostrarVinculo = false, vazio = "Nenhuma tarefa" }: {
    tarefas: TarefaLinha[];
    hoje: string;
    onAbrir: (t: TarefaLinha) => void;
    onAlternar: (t: TarefaLinha) => void;
    mostrarVinculo?: boolean;
    vazio?: string;
}) {
    if (!tarefas.length) {
        return <Typography variant="body2" color="text.disabled" sx={{ py: 1.5, textAlign: "center" }}>{vazio}</Typography>;
    }
    return (
        <Stack>
            {tarefas.map((t) => {
                const fechada = !tarefaAberta(t.status);
                const atrasada = !fechada && grupoPrazo(t.prazo, hoje) === "atrasadas";
                return (
                    <Stack
                        key={t.id}
                        direction="row"
                        spacing={1.25}
                        onClick={() => onAbrir(t)}
                        sx={{ alignItems: "center", py: 0.5, px: 0.5, borderRadius: 1.5, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                    >
                        <Checkbox
                            size="small"
                            checked={t.status === "concluida"}
                            disabled={t.status === "cancelada"}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => onAlternar(t)}
                            slotProps={{ input: { "aria-label": `Concluir ${t.titulo}` } }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, textDecoration: fechada ? "line-through" : "none", color: fechada ? "text.disabled" : "text.primary" }}>
                                {t.titulo}
                            </Typography>
                            {mostrarVinculo && t.rotuloVinculo && (
                                <Typography noWrap variant="caption" color="text.secondary" component="div">{t.rotuloVinculo}</Typography>
                            )}
                        </Box>
                        {t.status === "cancelada" && <Chip size="small" label="Cancelada" />}
                        {t.prioridade !== "media" && t.status !== "cancelada" && <Chip size="small" variant="outlined" label={LABEL_PRIORIDADE[t.prioridade]} color={COR_PRIORIDADE[t.prioridade]} />}
                        <Typography variant="caption" sx={{ minWidth: 92, textAlign: "right", color: atrasada ? "error.main" : "text.secondary", fontWeight: atrasada ? 700 : 400 }}>
                            {textoPrazo(t.prazo, t.prazo_hora, hoje)}
                        </Typography>
                        <Tooltip title={t.responsavel.nome}>
                            <Avatar sx={{ width: 26, height: 26, fontSize: 11, bgcolor: avatarColor(t.responsavel.nome) }}>{initials(t.responsavel.nome)}</Avatar>
                        </Tooltip>
                    </Stack>
                );
            })}
        </Stack>
    );
}
