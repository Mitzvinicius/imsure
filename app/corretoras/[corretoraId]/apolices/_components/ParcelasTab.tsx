'use client';
import { CampoMoeda } from "@/app/ui/design/CamposMascarados";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { adicionarParcelas, atualizarParcela, darBaixaManual } from "@/app/lib/actions-seguros";
import { formatData } from "@/app/lib/seguros/datas";
import { LABEL_STATUS_PARCELA, type Endosso, type Parcela, type ParcelaForm } from "@/app/lib/seguros/types";
import { formatBRL } from "../../funis/constants";
import ParcelasFields from "./ParcelasFields";
import { usePermissoes } from "@/app/ui/design/PermissoesContext";

const COR = { aberta: "default", paga: "success", comissao_recebida: "info" } as const;

export default function ParcelasTab({
    apoliceId,
    parcelas,
    endossos,
    mostrarBoleto,
    premio,
    percentualComissao,
}: {
    apoliceId: string;
    parcelas: Parcela[];
    endossos: Endosso[];
    mostrarBoleto: boolean;
    premio: number | null;
    percentualComissao: number | null;
}) {
    const router = useRouter();
    const { pode } = usePermissoes();
    const [adicionando, setAdicionando] = useState(false);
    const [novas, setNovas] = useState<ParcelaForm[]>([]);
    const [erroNovas, setErroNovas] = useState<string | null>(null);
    const ultimoNumero = Math.max(0, ...parcelas.filter((p) => !p.endosso_id).map((p) => p.numero));

    async function salvarNovas() {
        setErroNovas(null);
        const r = await adicionarParcelas({
            apoliceId,
            endossoId: null,
            parcelas: novas.map((p, i) => ({ ...p, numero: ultimoNumero + i + 1 })),
        });
        if (r.error) { setErroNovas(r.error); return; }
        setAdicionando(false);
        setNovas([]);
        router.refresh();
    }

    const dialogAdicionar = (
        <Dialog open={adicionando} onClose={() => setAdicionando(false)} fullWidth maxWidth="md">
            <DialogTitle>Adicionar parcelas da apólice</DialogTitle>
            <DialogContent>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                    {ultimoNumero > 0 && <Typography variant="body2" color="text.secondary">As novas parcelas serão numeradas a partir de {ultimoNumero + 1}.</Typography>}
                    <ParcelasFields parcelas={novas} onChange={setNovas} premio={premio} percentualComissao={percentualComissao} mostrarBoleto={mostrarBoleto} />
                    {erroNovas && <Alert severity="error">{erroNovas}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setAdicionando(false)}>Cancelar</Button>
                <Button variant="contained" disabled={!novas.length} onClick={salvarNovas}>Salvar parcelas</Button>
            </DialogActions>
        </Dialog>
    );
    const botaoAdicionar = (
        <Button variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => setAdicionando(true)}>Adicionar parcelas</Button>
    );
    const [editando, setEditando] = useState<Parcela | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const nomeEndosso = (id: string | null) => (id ? `Endosso ${endossos.find((e) => e.id === id)?.numero ?? ""}` : "Apólice");

    async function baixa(p: Parcela) {
        setErro(null);
        const r = await darBaixaManual({ parcelaId: p.id, desfazer: p.status !== "aberta" });
        if (r.error) setErro(r.error); else router.refresh();
    }

    async function salvarEdicao() {
        if (!editando) return;
        const r = await atualizarParcela({
            parcelaId: editando.id,
            dados: {
                vencimento: editando.vencimento,
                valor: editando.valor,
                comissao_esperada: editando.comissao_esperada,
                linha_digitavel: editando.linha_digitavel,
                pix_copia_cola: editando.pix_copia_cola,
            },
        });
        if (r.error) { setErro(r.error); return; }
        setEditando(null);
        router.refresh();
    }

    if (!parcelas.length) {
        return (
            <Stack spacing={1.5}>
                <Typography color="text.secondary">Nenhuma parcela cadastrada.</Typography>
                {botaoAdicionar}
                {dialogAdicionar}
            </Stack>
        );
    }

    return (
        <Stack spacing={1.5}>
            {botaoAdicionar}
            {dialogAdicionar}
            {erro && <Alert severity="error">{erro}</Alert>}
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Origem</TableCell><TableCell>Nº</TableCell><TableCell>Vencimento</TableCell>
                        <TableCell>Valor</TableCell><TableCell>Comissão esperada</TableCell><TableCell>Status</TableCell><TableCell align="right">Ações</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {parcelas.map((p) => (
                        <TableRow key={p.id}>
                            <TableCell>{nomeEndosso(p.endosso_id)}</TableCell>
                            <TableCell>{p.numero}</TableCell>
                            <TableCell>{formatData(p.vencimento)}</TableCell>
                            <TableCell>{formatBRL(p.valor)}</TableCell>
                            <TableCell>{p.comissao_esperada != null ? formatBRL(p.comissao_esperada) : "—"}</TableCell>
                            <TableCell>
                                <Chip size="small" color={COR[p.status]} label={LABEL_STATUS_PARCELA[p.status] + (p.baixa_origem === "manual" ? " (manual)" : "")} />
                            </TableCell>
                            <TableCell align="right">
                                <Button size="small" onClick={() => setEditando(p)}>Editar</Button>
                                {p.baixa_origem !== "extrato" && pode("parcelas.baixa") && (
                                    <Button size="small" onClick={() => baixa(p)}>{p.status === "aberta" ? "Dar baixa" : "Desfazer baixa"}</Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={!!editando} onClose={() => setEditando(null)} fullWidth maxWidth="sm">
                <DialogTitle>Editar parcela {editando?.numero}</DialogTitle>
                {editando && (
                    <DialogContent>
                        <Stack spacing={1.5} sx={{ mt: 1 }}>
                            <TextField label="Vencimento" type="date" value={editando.vencimento} onChange={(e) => setEditando({ ...editando, vencimento: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                            <CampoMoeda label="Valor" valor={editando.valor} onValor={(v) => setEditando({ ...editando, valor: v ?? 0 })} />
                            <CampoMoeda label="Comissão esperada" valor={editando.comissao_esperada} onValor={(v) => setEditando({ ...editando, comissao_esperada: v })} />
                            {mostrarBoleto && (
                                <>
                                    <TextField label="Linha digitável" value={editando.linha_digitavel ?? ""} onChange={(e) => setEditando({ ...editando, linha_digitavel: e.target.value || null })} />
                                    <TextField label="PIX copia e cola" value={editando.pix_copia_cola ?? ""} onChange={(e) => setEditando({ ...editando, pix_copia_cola: e.target.value || null })} />
                                </>
                            )}
                        </Stack>
                    </DialogContent>
                )}
                <DialogActions>
                    <Button onClick={() => setEditando(null)}>Cancelar</Button>
                    <Button variant="contained" onClick={salvarEdicao}>Salvar</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
