'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import { aceitarConvite } from "@/app/lib/actions-equipe";
import { createClient } from "@/utils/supabase/client";

const MENSAGEM: Record<string, string> = {
    expirado: "Este convite expirou. Peça um novo link a quem convidou você.",
    cancelado: "Este convite foi cancelado. Peça um novo link a quem convidou você.",
    aceito: "Este convite já foi usado.",
    invalido: "Convite não encontrado. Confira se o link está completo.",
};

export default function ConviteAceite({
    token, info, emailLogado,
}: {
    token: string;
    info: { corretora_nome: string | null; cargo_nome: string | null; convidado_por: string | null; email: string | null; situacao: string };
    emailLogado: string | null;
}) {
    const router = useRouter();
    const [erro, setErro] = useState<string | null>(null);
    const [aceitando, setAceitando] = useState(false);
    const voltar = `/convite/${token}`;
    const emailDiferente = !!emailLogado && !!info.email && emailLogado.toLowerCase() !== info.email.toLowerCase();

    async function aceitar() {
        setErro(null);
        setAceitando(true);
        const r = await aceitarConvite({ token });
        setAceitando(false);
        if (r.error || !r.corretoraId) { setErro(r.error ?? "Não foi possível aceitar."); return; }
        router.push(`/corretoras/${r.corretoraId}/funis`);
    }

    async function trocarConta() {
        await createClient().auth.signOut();
        router.push(`/auth?next=${encodeURIComponent(voltar)}`);
    }

    return (
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default" }}>
            <Paper variant="outlined" sx={{ p: 4, maxWidth: 460, width: "100%", borderRadius: 3 }}>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <CloudOutlinedIcon color="secondary" />
                        <Typography sx={{ fontWeight: 800, fontSize: 22 }}>imsure</Typography>
                    </Stack>
                    {info.situacao !== "pendente" ? (
                        <Alert severity="warning">{MENSAGEM[info.situacao] ?? MENSAGEM.invalido}</Alert>
                    ) : (
                        <>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                {info.convidado_por ?? "Alguém"} convidou você para a equipe da {info.corretora_nome}
                            </Typography>
                            <Typography color="text.secondary">Cargo: <b>{info.cargo_nome}</b> · convite para <b>{info.email}</b></Typography>
                            {!emailLogado && (
                                <Stack spacing={1}>
                                    <Button variant="contained" onClick={() => router.push(`/auth?next=${encodeURIComponent(voltar)}`)}>Entrar ou criar conta</Button>
                                    <Typography variant="caption" color="text.secondary">Use o e-mail {info.email}.</Typography>
                                </Stack>
                            )}
                            {emailDiferente && (
                                <Alert severity="info" action={<Button color="inherit" size="small" onClick={trocarConta}>Trocar de conta</Button>}>
                                    Você entrou como {emailLogado}, mas o convite é para {info.email}.
                                </Alert>
                            )}
                            {emailLogado && !emailDiferente && (
                                <Button variant="contained" disabled={aceitando} onClick={aceitar}>{aceitando ? "Entrando..." : "Aceitar convite"}</Button>
                            )}
                        </>
                    )}
                    {erro && <Alert severity="error">{erro}</Alert>}
                </Stack>
            </Paper>
        </Box>
    );
}
