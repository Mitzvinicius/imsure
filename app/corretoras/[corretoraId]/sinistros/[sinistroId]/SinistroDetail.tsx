'use client';
import { CampoMoeda } from "@/app/ui/design/CamposMascarados";
import { useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { atualizarSinistro, registrarAndamento } from "@/app/lib/actions-seguros";
import { LABEL_STATUS_SINISTRO, statusDoRamo, type StatusSinistro } from "@/app/lib/seguros/sinistros";
import { tipoBemDoRamo } from "@/app/lib/seguros/ramos";
import { formatData } from "@/app/lib/seguros/datas";
import type { Andamento } from "@/app/lib/seguros/types";
import AnexosApoliceTab from "../../apolices/_components/AnexosApoliceTab";

type Sinistro = {
    id: string; data_ocorrencia: string; tipo: string; descricao: string | null;
    numero_seguradora: string | null; status: StatusSinistro; valor_indenizacao: number | null;
};
type Apolice = { id: string; numero: string; ramo: string; contato: { nome: string } | null; seguradora: { nome: string; telefone_sinistro: string | null } | null };

export default function SinistroDetail({ corretoraId, sinistro, apolice, andamentos }: { corretoraId: string; sinistro: Sinistro; apolice: Apolice; andamentos: Andamento[] }) {
    const router = useRouter();
    const etapas = statusDoRamo(apolice.ramo);
    const ativo = etapas.indexOf(sinistro.status);
    const ehRc = tipoBemDoRamo(apolice.ramo) === "rc";

    const [descricaoAnd, setDescricaoAnd] = useState("");
    const [statusNovo, setStatusNovo] = useState<string>("");
    const [processo, setProcesso] = useState("");
    const [numeroSeg, setNumeroSeg] = useState(sinistro.numero_seguradora ?? "");
    const [valorInd, setValorInd] = useState<number | null>(sinistro.valor_indenizacao);
    const [descricao, setDescricao] = useState(sinistro.descricao ?? "");
    const [erro, setErro] = useState<string | null>(null);
    const [versaoAnexos, setVersaoAnexos] = useState(0);
    const [ultimoAndamentoId, setUltimoAndamentoId] = useState<string | null>(null);

    async function salvarAndamento() {
        setErro(null);
        const r = await registrarAndamento({ sinistroId: sinistro.id, descricao: descricaoAnd, statusNovo: statusNovo || null, numeroProcesso: processo || null });
        if (r.error) { setErro(r.error); return; }
        setDescricaoAnd(""); setStatusNovo(""); setProcesso("");
        setUltimoAndamentoId(r.andamentoId);
        router.refresh();
    }

    async function salvarDados() {
        setErro(null);
        const r = await atualizarSinistro({ sinistroId: sinistro.id, descricao: descricao || null, numeroSeguradora: numeroSeg || null, valorIndenizacao: valorInd });
        if (r.error) setErro(r.error); else router.refresh();
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1100 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(`/corretoras/${corretoraId}/sinistros`)} sx={{ mb: 1 }}>Sinistros</Button>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{sinistro.tipo} · {formatData(sinistro.data_ocorrencia)}</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
                {apolice.contato?.nome} · <Link component={NextLink} href={`/corretoras/${corretoraId}/apolices/${apolice.id}`}>Apólice {apolice.numero}</Link> · {apolice.seguradora?.nome}
                {apolice.seguradora?.telefone_sinistro ? ` · Sinistro: ${apolice.seguradora.telefone_sinistro}` : ""}
            </Typography>

            <Paper variant="outlined" sx={{ p: 2.5, mb: 2, overflowX: "auto" }}>
                <Stepper activeStep={ativo} alternativeLabel>
                    {etapas.map((s) => <Step key={s}><StepLabel>{LABEL_STATUS_SINISTRO[s]}</StepLabel></Step>)}
                </Stepper>
            </Paper>

            {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "flex-start" }}>
                <Paper variant="outlined" sx={{ p: 2.5, flex: 1.4, width: "100%" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Registrar andamento</Typography>
                    <Stack spacing={1.5}>
                        <TextField label="O que aconteceu" multiline minRows={2} value={descricaoAnd} onChange={(e) => setDescricaoAnd(e.target.value)} />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField select label="Mudar status para" value={statusNovo} onChange={(e) => setStatusNovo(e.target.value)} sx={{ flex: 1 }}>
                                <MenuItem value="">Manter ({LABEL_STATUS_SINISTRO[sinistro.status]})</MenuItem>
                                {etapas.filter((s) => s !== sinistro.status).map((s) => <MenuItem key={s} value={s}>{LABEL_STATUS_SINISTRO[s]}</MenuItem>)}
                            </TextField>
                            {ehRc && <TextField label="Nº do processo" value={processo} onChange={(e) => setProcesso(e.target.value)} sx={{ flex: 1 }} />}
                        </Stack>
                        <Button variant="contained" sx={{ alignSelf: "flex-end" }} disabled={!descricaoAnd.trim()} onClick={salvarAndamento}>Registrar</Button>
                    </Stack>

                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Histórico</Typography>
                    <Stack spacing={1.5}>
                        {andamentos.map((a) => (
                            <Box key={a.id} sx={{ borderLeft: 3, borderColor: a.status_novo ? "primary.main" : "divider", pl: 1.5 }}>
                                <Typography variant="caption" color="text.secondary">{formatData(a.data)} · {a.usuario_nome}</Typography>
                                {a.status_novo && <Typography variant="body2" sx={{ fontWeight: 700 }}>→ {LABEL_STATUS_SINISTRO[a.status_novo]}</Typography>}
                                <Typography variant="body2">{a.descricao}</Typography>
                                {a.numero_processo && <Typography variant="caption">Processo {a.numero_processo}</Typography>}
                            </Box>
                        ))}
                    </Stack>
                </Paper>

                <Stack spacing={2} sx={{ flex: 1, width: "100%" }}>
                    <Paper variant="outlined" sx={{ p: 2.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Dados do sinistro</Typography>
                        <Stack spacing={1.5}>
                            <TextField label="Nº na seguradora" value={numeroSeg} onChange={(e) => setNumeroSeg(e.target.value)} />
                            <CampoMoeda label="Valor da indenização" valor={valorInd} onValor={setValorInd} />
                            <TextField label="Descrição" multiline minRows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                            <Button variant="outlined" sx={{ alignSelf: "flex-end" }} onClick={salvarDados}>Salvar dados</Button>
                        </Stack>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Documentos</Typography>
                        <AnexosApoliceTab apoliceId={apolice.id} sinistroId={sinistro.id} andamentoId={ultimoAndamentoId} versao={versaoAnexos} />
                        <Button size="small" sx={{ mt: 1 }} onClick={() => setVersaoAnexos((v) => v + 1)}>Atualizar lista</Button>
                    </Paper>
                </Stack>
            </Stack>
        </Box>
    );
}
