'use client';
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
import { atualizarParcela, darBaixaManual } from "@/app/lib/actions-seguros";
import { formatData, parseValorBR } from "@/app/lib/seguros/datas";
import { LABEL_STATUS_PARCELA, type Endosso, type Parcela } from "@/app/lib/seguros/types";
import { formatBRL } from "../../funis/constants";

const COR = { aberta: "default", paga: "success", comissao_recebida: "info" } as const;
const num = (n: number | null) => (n != null ? String(n).replace(".", ",") : "");

export default function ParcelasTab({ parcelas, endossos, mostrarBoleto }: { parcelas: Parcela[]; endossos: Endosso[]; mostrarBoleto: boolean }) {
    const router = useRouter();
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

    if (!parcelas.length) return <Typography color="text.secondary">Nenhuma parcela cadastrada.</Typography>;

    return (
        <Stack spacing={1.5}>
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
                                {p.baixa_origem !== "extrato" && (
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
                            <TextField label="Valor (R$)" value={num(editando.valor)} onChange={(e) => setEditando({ ...editando, valor: parseValorBR(e.target.value) ?? 0 })} />
                            <TextField label="Comissão esperada (R$)" value={num(editando.comissao_esperada)} onChange={(e) => setEditando({ ...editando, comissao_esperada: parseValorBR(e.target.value) })} />
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
