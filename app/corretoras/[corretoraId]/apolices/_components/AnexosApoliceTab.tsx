'use client';
import { useCallback, useEffect, useRef, useState } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { deletarAnexoApolice, listarAnexosApolice, uploadAnexoApolice } from "@/app/lib/actions-seguros";
import { formatData } from "@/app/lib/seguros/datas";
import type { AnexoApolice } from "@/app/lib/seguros/types";

export default function AnexosApoliceTab({
    apoliceId,
    sinistroId = null,
    andamentoId = null,
    versao = 0,
}: {
    apoliceId: string;
    sinistroId?: string | null;
    andamentoId?: string | null;
    versao?: number;
}) {
    const [anexos, setAnexos] = useState<AnexoApolice[]>([]);
    const [erro, setErro] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    const carregar = useCallback(async () => {
        const r = await listarAnexosApolice({ apoliceId, sinistroId });
        if (r.error) setErro(r.error); else setAnexos(r.anexos);
    }, [apoliceId, sinistroId]);

    useEffect(() => {
        let ativo = true;
        listarAnexosApolice({ apoliceId, sinistroId }).then((r) => {
            if (!ativo) return;
            if (r.error) setErro(r.error); else setAnexos(r.anexos);
        });
        return () => { ativo = false; };
    }, [apoliceId, sinistroId, versao]);

    async function enviar(arquivo: File) {
        setErro(null);
        setEnviando(true);
        const fd = new FormData();
        fd.set("apoliceId", apoliceId);
        fd.set("arquivo", arquivo);
        if (sinistroId) fd.set("sinistroId", sinistroId);
        if (andamentoId) fd.set("andamentoId", andamentoId);
        try {
            const r = await uploadAnexoApolice(fd);
            if (r.error) setErro(r.error); else carregar();
        } catch {
            setErro("Não foi possível enviar o arquivo (máximo 20MB).");
        } finally {
            setEnviando(false);
        }
    }

    async function remover(id: string) {
        const r = await deletarAnexoApolice({ anexoId: id });
        if (r.error) setErro(r.error); else carregar();
    }

    return (
        <Stack spacing={1.5}>
            <input ref={input} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar(f); e.target.value = ""; }} />
            <Button startIcon={<UploadFileIcon />} variant="outlined" disabled={enviando} sx={{ alignSelf: "flex-start" }} onClick={() => input.current?.click()}>
                {enviando ? "Enviando..." : "Enviar arquivo"}
            </Button>
            {erro && <Alert severity="error">{erro}</Alert>}
            {!anexos.length && <Typography color="text.secondary">Nenhum arquivo.</Typography>}
            {anexos.map((a) => (
                <Stack key={a.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {a.url ? <Link href={a.url} target="_blank" rel="noreferrer">{a.nome_arquivo}</Link> : <Typography>{a.nome_arquivo}</Typography>}
                    <Typography variant="caption" color="text.secondary">{a.usuario_nome} · {formatData(a.criado_em)}</Typography>
                    <IconButton size="small" aria-label="Remover arquivo" onClick={() => remover(a.id)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Stack>
            ))}
        </Stack>
    );
}
