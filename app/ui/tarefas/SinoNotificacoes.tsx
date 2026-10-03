'use client';
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import { createClient } from "@/utils/supabase/client";
import { tempoRelativo, textoOutrasCorretoras } from "@/app/lib/tarefas/regras";
import type { NotificacaoLinha, TipoNotificacao } from "@/app/lib/tarefas/tipos";
import { usePermissoes } from "@/app/ui/design/PermissoesContext";

const ICONE: Record<TipoNotificacao, typeof TaskAltOutlinedIcon> = {
    tarefa_atribuida: AssignmentIndOutlinedIcon,
    mencao: AlternateEmailIcon,
    comentario_tarefa: ChatBubbleOutlineIcon,
    prazo_hoje: TodayOutlinedIcon,
    tarefa_atrasada: WarningAmberOutlinedIcon,
    tarefa_concluida: TaskAltOutlinedIcon,
};

/** Mostra as notificações da corretora aberta; as das outras corretoras aparecem só como contagem. */
export default function SinoNotificacoes({ corretoraId }: { corretoraId: string }) {
    const { usuarioId } = usePermissoes();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [itens, setItens] = useState<NotificacaoLinha[]>([]);
    const [naoLidas, setNaoLidas] = useState(0);
    const [outrasNaoLidas, setOutrasNaoLidas] = useState(0);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    const carregar = useCallback(async () => {
        const [lista, contagem, outras] = await Promise.all([
            supabase.from("notificacoes").select("id, tipo, titulo, texto, link, lida_em, criado_em").eq("corretora_id", corretoraId).order("criado_em", { ascending: false }).limit(20),
            supabase.from("notificacoes").select("id", { count: "exact", head: true }).eq("corretora_id", corretoraId).is("lida_em", null),
            supabase.from("notificacoes").select("id", { count: "exact", head: true }).neq("corretora_id", corretoraId).is("lida_em", null),
        ]);
        setItens((lista.data ?? []) as NotificacaoLinha[]);
        setNaoLidas(contagem.count ?? 0);
        setOutrasNaoLidas(outras.count ?? 0);
    }, [supabase, corretoraId]);

    useEffect(() => {
        const inicial = setTimeout(carregar, 0);
        const canal = supabase
            .channel(`notificacoes:${usuarioId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificacoes", filter: `usuario_id=eq.${usuarioId}` }, () => { carregar(); })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notificacoes", filter: `usuario_id=eq.${usuarioId}` }, () => { carregar(); })
            .subscribe();
        return () => { clearTimeout(inicial); supabase.removeChannel(canal); };
    }, [supabase, usuarioId, carregar]);

    async function abrir(n: NotificacaoLinha) {
        setAnchor(null);
        if (!n.lida_em) {
            setItens((l) => l.map((x) => (x.id === n.id ? { ...x, lida_em: new Date().toISOString() } : x)));
            setNaoLidas((c) => Math.max(0, c - 1));
            await supabase.from("notificacoes").update({ lida_em: new Date().toISOString() }).eq("id", n.id);
        }
        router.push(n.link);
    }

    async function marcarTodas() {
        setItens((l) => l.map((x) => ({ ...x, lida_em: x.lida_em ?? new Date().toISOString() })));
        setNaoLidas(0);
        await supabase.from("notificacoes").update({ lida_em: new Date().toISOString() }).eq("corretora_id", corretoraId).is("lida_em", null);
    }

    const agora = new Date();
    return (
        <>
            <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} sx={{ color: "rgba(255,255,255,.85)" }} title="Notificações" aria-label={`Notificações (${naoLidas} não lidas)`}>
                <Badge badgeContent={naoLidas} color="secondary" max={99}>
                    <NotificationsNoneOutlinedIcon fontSize="small" />
                </Badge>
            </IconButton>
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { width: 360, maxHeight: 480 } } }}>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>Notificações</Typography>
                    <Button size="small" onClick={marcarTodas} disabled={naoLidas === 0}>Marcar todas como lidas</Button>
                </Stack>
                {textoOutrasCorretoras(outrasNaoLidas) && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, pb: 1 }}>
                        {textoOutrasCorretoras(outrasNaoLidas)} — troque de empresa no seletor para ver.
                    </Typography>
                )}
                <Divider />
                {itens.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: "center" }}>Nada por aqui ainda</Typography>}
                {itens.map((n) => {
                    const Icone = ICONE[n.tipo];
                    return (
                        <MenuItem key={n.id} onClick={() => abrir(n)} sx={{ alignItems: "flex-start", gap: 1.25, whiteSpace: "normal", bgcolor: n.lida_em ? "transparent" : "action.hover" }}>
                            <Icone fontSize="small" sx={{ mt: 0.25, color: n.tipo === "tarefa_atrasada" ? "error.main" : "primary.main" }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: 13.5, fontWeight: n.lida_em ? 500 : 700 }}>{n.titulo}</Typography>
                                {n.texto && <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12.5 }} noWrap>{n.texto}</Typography>}
                                <Typography variant="caption" color="text.disabled">{tempoRelativo(n.criado_em, agora)}</Typography>
                            </Box>
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
}
