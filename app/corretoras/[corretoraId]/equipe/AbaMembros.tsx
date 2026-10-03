'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import LinearProgress from "@mui/material/LinearProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { alterarCargoMembro, alterarStatusMembro, cancelarConvite, convidarMembro, gerarNovoLinkConvite, transferirCarteira } from "@/app/lib/actions-equipe";
import { linkConvite, mensagemWhatsappConvite, textoUsoPlano } from "@/app/lib/equipe/permissoes";
import { initials, avatarColor } from "@/app/ui/design/avatar";
import { formatData } from "@/app/lib/seguros/datas";
import type { Cargo, ConvitePendente, Membro, UsoPlano } from "./tipos";

export default function AbaMembros({
    corretoraId, corretoraNome, membros, cargos, convites, uso, podeGerenciar, podeTransferir,
}: {
    corretoraId: string; corretoraNome: string; membros: Membro[]; cargos: Cargo[]; convites: ConvitePendente[];
    uso: UsoPlano; podeGerenciar: boolean; podeTransferir: boolean;
}) {
    const router = useRouter();
    const [erro, setErro] = useState<string | null>(null);
    const [convidando, setConvidando] = useState(false);
    const [email, setEmail] = useState("");
    const [cargoId, setCargoId] = useState(cargos.find((c) => c.chave === "produtor")?.id ?? "");
    const [link, setLink] = useState<{ url: string; cargo: string } | null>(null);
    const [copiado, setCopiado] = useState<"link" | "mensagem" | null>(null);
    const [menu, setMenu] = useState<{ anchor: HTMLElement; membro: Membro } | null>(null);
    const [transferindo, setTransferindo] = useState<Membro | null>(null);
    const [destino, setDestino] = useState("");
    const noLimite = uso.usados >= uso.limite;

    async function executar(p: Promise<{ error: string | null }>) {
        setErro(null);
        const r = await p;
        if (r.error) setErro(r.error); else router.refresh();
    }

    function mostrarLink(token: string, cargo: string) {
        setLink({ url: linkConvite(window.location.origin, token), cargo });
        setCopiado(null);
    }

    async function convidar() {
        setErro(null);
        const r = await convidarMembro({ corretoraId, email, cargoId });
        if (r.error || !r.token) { setErro(r.error ?? "Não foi possível criar o convite."); return; }
        mostrarLink(r.token, cargos.find((c) => c.id === cargoId)?.nome ?? "");
        setEmail("");
        router.refresh();
    }

    async function copiar(texto: string, tipo: "link" | "mensagem") {
        await navigator.clipboard.writeText(texto);
        setCopiado(tipo);
    }

    return (
        <>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", mb: 2 }}>
                <Box sx={{ minWidth: 240 }}>
                    <Typography variant="body2" color="text.secondary">{textoUsoPlano(uso)}</Typography>
                    <LinearProgress variant="determinate" value={Math.min(100, (uso.usados / Math.max(uso.limite, 1)) * 100)} color={noLimite ? "warning" : "primary"} sx={{ mt: 0.5, borderRadius: 1 }} />
                </Box>
                {podeGerenciar && (
                    <Button variant="contained" startIcon={<PersonAddAlt1OutlinedIcon />} disabled={noLimite} onClick={() => { setConvidando(true); setLink(null); setErro(null); }}>
                        Convidar pessoa
                    </Button>
                )}
            </Stack>
            {podeGerenciar && noLimite && (
                <Alert severity="warning" sx={{ mb: 2 }}>Seu plano {uso.plano} permite {uso.limite} usuários. Mude de plano para adicionar mais.</Alert>
            )}
            {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

            <Stack spacing={1}>
                {membros.map((m) => (
                    <Paper key={m.usuarioId} variant="outlined" sx={{ p: 1.5, borderRadius: 2, opacity: m.ativo ? 1 : 0.6 }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <Avatar sx={{ bgcolor: avatarColor(m.nome) }}>{initials(m.nome)}</Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700 }} noWrap>{m.nome}{m.dono ? " · dono da conta" : ""}</Typography>
                                <Typography variant="body2" color="text.secondary" noWrap>{m.email}</Typography>
                            </Box>
                            <Chip size="small" label={m.cargoNome} />
                            {!m.ativo && <Chip size="small" color="default" variant="outlined" label="Desativado" />}
                            {(podeGerenciar || podeTransferir) && !m.dono && (
                                <IconButton size="small" aria-label="Ações do membro" onClick={(e) => setMenu({ anchor: e.currentTarget, membro: m })}><MoreVertIcon fontSize="small" /></IconButton>
                            )}
                        </Stack>
                    </Paper>
                ))}
            </Stack>

            {podeGerenciar && convites.length > 0 && (
                <>
                    <Typography sx={{ fontWeight: 800, mt: 3, mb: 1 }}>Convites pendentes</Typography>
                    <Stack spacing={1}>
                        {convites.map((c) => (
                            <Paper key={c.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderStyle: "dashed" }}>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontWeight: 700 }}>{c.email}</Typography>
                                        <Typography variant="body2" color="text.secondary">{c.cargoNome} · {c.expirado ? "expirado" : `vale até ${formatData(c.expiraEm)}`}</Typography>
                                    </Box>
                                    <Button size="small" onClick={async () => {
                                        const r = await gerarNovoLinkConvite({ conviteId: c.id });
                                        if (r.error || !r.token) { setErro(r.error); return; }
                                        mostrarLink(r.token, c.cargoNome);
                                        setConvidando(true);
                                        router.refresh();
                                    }}>Gerar novo link</Button>
                                    <Button size="small" color="error" onClick={() => executar(cancelarConvite({ conviteId: c.id }))}>Cancelar</Button>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                </>
            )}

            <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
                {menu && podeGerenciar && cargos.filter((c) => c.id !== menu.membro.cargoId).map((c) => (
                    <MenuItem key={c.id} onClick={() => { const m = menu.membro; setMenu(null); executar(alterarCargoMembro({ corretoraId, usuarioId: m.usuarioId, cargoId: c.id })); }}>
                        Tornar {c.nome}
                    </MenuItem>
                ))}
                {menu && podeTransferir && menu.membro.ativo && (
                    <MenuItem onClick={() => { setTransferindo(menu.membro); setDestino(""); setMenu(null); }}>Transferir carteira…</MenuItem>
                )}
                {menu && podeGerenciar && (
                    <MenuItem onClick={() => { const m = menu.membro; setMenu(null); executar(alterarStatusMembro({ corretoraId, usuarioId: m.usuarioId, ativo: !m.ativo })); }}>
                        {menu.membro.ativo ? "Desativar acesso" : "Reativar acesso"}
                    </MenuItem>
                )}
            </Menu>

            <Dialog open={convidando} onClose={() => setConvidando(false)} fullWidth maxWidth="sm">
                <DialogTitle>{link ? "Convite criado" : "Convidar pessoa"}</DialogTitle>
                <DialogContent>
                    {link ? (
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Typography variant="body2">Envie o link para a pessoa (vale por 7 dias). Ela entra com o mesmo e-mail do convite.</Typography>
                            <TextField value={link.url} slotProps={{ htmlInput: { readOnly: true } }} fullWidth />
                            <Stack direction="row" spacing={1}>
                                <Button startIcon={<ContentCopyIcon />} variant="contained" onClick={() => copiar(link.url, "link")}>{copiado === "link" ? "Link copiado!" : "Copiar link"}</Button>
                                <Button startIcon={<ContentCopyIcon />} onClick={() => copiar(mensagemWhatsappConvite({ corretora: corretoraNome, cargo: link.cargo, link: link.url }), "mensagem")}>
                                    {copiado === "mensagem" ? "Mensagem copiada!" : "Copiar mensagem para WhatsApp"}
                                </Button>
                            </Stack>
                        </Stack>
                    ) : (
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                            <TextField select label="Cargo" value={cargoId} onChange={(e) => setCargoId(e.target.value)}>
                                {cargos.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
                            </TextField>
                            {erro && <Alert severity="error">{erro}</Alert>}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConvidando(false)}>{link ? "Fechar" : "Cancelar"}</Button>
                    {!link && <Button variant="contained" disabled={!email.trim() || !cargoId} onClick={convidar}>Criar convite</Button>}
                </DialogActions>
            </Dialog>

            <Dialog open={!!transferindo} onClose={() => setTransferindo(null)} fullWidth maxWidth="xs">
                <DialogTitle>Transferir carteira de {transferindo?.nome}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>Negócios em aberto e apólices passam para a pessoa escolhida.</Typography>
                    <TextField select fullWidth label="Para" value={destino} onChange={(e) => setDestino(e.target.value)}>
                        {membros.filter((m) => m.ativo && m.usuarioId !== transferindo?.usuarioId).map((m) => <MenuItem key={m.usuarioId} value={m.usuarioId}>{m.nome}</MenuItem>)}
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTransferindo(null)}>Cancelar</Button>
                    <Button variant="contained" disabled={!destino} onClick={async () => {
                        const r = await transferirCarteira({ corretoraId, deUsuarioId: transferindo!.usuarioId, paraUsuarioId: destino });
                        setTransferindo(null);
                        if (r.error) setErro(r.error); else router.refresh();
                    }}>Transferir</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
