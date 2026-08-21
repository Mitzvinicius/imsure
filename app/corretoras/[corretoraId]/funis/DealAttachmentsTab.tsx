'use client';
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { deletarAnexo, listarAnexos, uploadAnexo } from "@/app/lib/actions";
import { Anexo } from "./types";

function formatarTamanho(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DealAttachmentsTab({ negocioId }: { negocioId: string }) {
    const [anexos, setAnexos] = useState<Anexo[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [arrastando, setArrastando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    async function recarregar() {
        const r = await listarAnexos({ negocioId });
        setAnexos(r.anexos as Anexo[]);
    }

    useEffect(() => {
        let ativo = true;
        listarAnexos({ negocioId }).then((r) => {
            if (ativo) {
                setAnexos(r.anexos as Anexo[]);
                setCarregando(false);
            }
        });
        return () => { ativo = false; };
    }, [negocioId]);

    async function enviarArquivos(arquivos: FileList | null) {
        if (!arquivos || arquivos.length === 0) return;
        setErro(null);
        setEnviando(true);
        for (const arquivo of Array.from(arquivos)) {
            const formData = new FormData();
            formData.append("negocioId", negocioId);
            formData.append("arquivo", arquivo);
            const r = await uploadAnexo(formData);
            if (r.error) setErro(r.error);
        }
        await recarregar();
        setEnviando(false);
    }

    async function excluir(anexoId: string) {
        setAnexos((prev) => prev.filter((a) => a.id !== anexoId));
        await deletarAnexo({ anexoId });
    }

    return (
        <Stack spacing={2.5}>
            <Box
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setArrastando(false);
                    enviarArquivos(e.dataTransfer.files);
                }}
                sx={{
                    p: 3,
                    border: "1.5px dashed",
                    borderColor: arrastando ? "primary.main" : "divider",
                    borderRadius: 2,
                    textAlign: "center",
                    cursor: "pointer",
                    bgcolor: arrastando ? "action.hover" : "transparent",
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => enviarArquivos(e.target.files)}
                />
                <CloudUploadOutlinedIcon sx={{ fontSize: 30, opacity: 0.5, mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Arraste um arquivo aqui ou clique para selecionar
                </Typography>
                <Typography variant="caption" color="text.secondary">Tamanho máximo: 20MB</Typography>
            </Box>

            {enviando && (
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" color="text.secondary">Enviando...</Typography>
                </Stack>
            )}
            {erro && <Typography variant="caption" color="error">{erro}</Typography>}

            {carregando ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
                    <CircularProgress size={22} />
                </Box>
            ) : anexos.length === 0 ? (
                <Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", py: 3 }}>
                    Nenhum anexo neste negócio
                </Typography>
            ) : (
                <Stack spacing={1}>
                    {anexos.map((a) => (
                        <Stack
                            key={a.id}
                            direction="row"
                            spacing={1.5}
                            sx={{ alignItems: "center", p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2 }}
                        >
                            <InsertDriveFileOutlinedIcon sx={{ color: "text.disabled" }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                    component={a.url ? "a" : "span"}
                                    href={a.url ?? undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    noWrap
                                    sx={{ fontSize: 13.5, fontWeight: 600, display: "block", color: "text.primary", textDecoration: "none" }}
                                >
                                    {a.nome_arquivo}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {formatarTamanho(a.tamanho_bytes)} · {a.usuario_nome} · {new Date(a.criado_em).toLocaleDateString("pt-BR")}
                                </Typography>
                            </Box>
                            <IconButton size="small" onClick={() => excluir(a.id)} title="Excluir anexo">
                                <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    ))}
                </Stack>
            )}
        </Stack>
    );
}
