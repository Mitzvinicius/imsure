'use client';
import { CampoMoeda } from "@/app/ui/design/CamposMascarados";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import { criarEndosso } from "@/app/lib/actions-seguros";
import { formatData } from "@/app/lib/seguros/datas";
import { LABEL_TIPO_ENDOSSO, type Cobertura, type CoberturaForm, type Endosso, type ParcelaForm, type TipoEndosso } from "@/app/lib/seguros/types";
import { formatBRL } from "../../funis/constants";
import CoberturasFields from "./CoberturasFields";
import ParcelasFields from "./ParcelasFields";

export default function EndossosTab({
    apoliceId,
    endossos,
    coberturasEndosso,
    percentualComissao,
    mostrarBoleto,
}: {
    apoliceId: string;
    endossos: Endosso[];
    coberturasEndosso: Cobertura[];
    percentualComissao: number | null;
    mostrarBoleto: boolean;
}) {
    const router = useRouter();
    const [aberto, setAberto] = useState(false);
    const [numero, setNumero] = useState("");
    const [tipo, setTipo] = useState<TipoEndosso>("alteracao_bem");
    const [dataEmissao, setDataEmissao] = useState("");
    const [descricao, setDescricao] = useState("");
    const [valor, setValor] = useState<number | null>(null);
    const [coberturas, setCoberturas] = useState<CoberturaForm[]>([]);
    const [parcelas, setParcelas] = useState<ParcelaForm[]>([]);
    const [erro, setErro] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);

    function limpar() {
        setNumero(""); setTipo("alteracao_bem"); setDataEmissao(""); setDescricao(""); setValor(null); setCoberturas([]); setParcelas([]); setErro(null);
    }


    async function salvar() {
        setSalvando(true);
        const r = await criarEndosso({
            apoliceId, numero, tipo,
            dataEmissao: dataEmissao || null,
            descricao: descricao || null,
            valor,
            coberturas, parcelas,
        });
        setSalvando(false);
        if (r.error) { setErro(r.error); return; }
        setAberto(false);
        limpar();
        router.refresh();
    }

    return (
        <Stack spacing={1.5}>
            <Button startIcon={<AddIcon />} variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => setAberto(true)}>Novo endosso</Button>
            {!endossos.length && <Typography color="text.secondary">Nenhum endosso nesta apólice.</Typography>}
            {endossos.map((e) => (
                <Paper key={e.id} variant="outlined" sx={{ p: 2 }}>
                    <Typography sx={{ fontWeight: 700 }}>Endosso {e.numero} · {LABEL_TIPO_ENDOSSO[e.tipo]}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Emissão {formatData(e.data_emissao)} · Valor {e.valor != null ? formatBRL(e.valor) : "—"}
                    </Typography>
                    {e.descricao && <Typography variant="body2" sx={{ mt: 1 }}>{e.descricao}</Typography>}
                    {coberturasEndosso.filter((c) => c.endosso_id === e.id).map((c) => (
                        <Typography key={c.id} variant="body2">
                            • {c.nome}{c.importancia_segurada != null ? ` — IS ${formatBRL(c.importancia_segurada)}` : ""}{c.franquia != null ? ` — franquia ${formatBRL(c.franquia)}` : ""}
                        </Typography>
                    ))}
                </Paper>
            ))}

            <Dialog open={aberto} onClose={() => setAberto(false)} fullWidth maxWidth="md">
                <DialogTitle>Novo endosso</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField label="Número do endosso" required value={numero} onChange={(e) => setNumero(e.target.value)} sx={{ flex: 1 }} />
                            <TextField select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoEndosso)} sx={{ flex: 1 }}>
                                {(Object.keys(LABEL_TIPO_ENDOSSO) as TipoEndosso[]).map((t) => <MenuItem key={t} value={t}>{LABEL_TIPO_ENDOSSO[t]}</MenuItem>)}
                            </TextField>
                            <TextField label="Emissão" type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                            <CampoMoeda label="Valor" valor={valor} onValor={setValor} permitirNegativo helperText="Digite - para restituição" sx={{ flex: 1 }} />
                        </Stack>
                        <TextField label="Descrição" multiline minRows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                        <Typography variant="subtitle2">Coberturas do endosso</Typography>
                        <CoberturasFields coberturas={coberturas} onChange={setCoberturas} />
                        <Typography variant="subtitle2">Parcelas do endosso</Typography>
                        <ParcelasFields parcelas={parcelas} onChange={setParcelas} premio={valor != null ? Math.abs(valor) : null} percentualComissao={percentualComissao} mostrarBoleto={mostrarBoleto} />
                        {erro && <Alert severity="error">{erro}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAberto(false)}>Cancelar</Button>
                    <Button variant="contained" disabled={salvando} onClick={salvar}>{salvando ? "Salvando..." : "Salvar endosso"}</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
