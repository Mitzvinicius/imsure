'use client';
import { useState } from "react";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { gerarParcelas, diferencaCentavos } from "@/app/lib/seguros/parcelas";
import { parseValorBR } from "@/app/lib/seguros/datas";
import type { ParcelaForm } from "@/app/lib/seguros/types";
import { formatBRL } from "../../funis/constants";

const num = (n: number | null) => (n != null ? String(n).replace(".", ",") : "");

export default function ParcelasFields({
    parcelas,
    onChange,
    premio,
    percentualComissao,
    mostrarBoleto,
}: {
    parcelas: ParcelaForm[];
    onChange: (p: ParcelaForm[]) => void;
    premio: number | null;
    percentualComissao: number | null;
    mostrarBoleto: boolean;
}) {
    const [quantidade, setQuantidade] = useState("1");
    const [primeiro, setPrimeiro] = useState("");
    const [erro, setErro] = useState<string | null>(null);

    function gerar() {
        setErro(null);
        try {
            const geradas = gerarParcelas({ total: premio ?? 0, quantidade: Number(quantidade), primeiroVencimento: primeiro });
            onChange(geradas.map((g) => ({
                ...g,
                comissao_esperada: percentualComissao != null ? Math.round(g.valor * percentualComissao) / 100 : null,
                linha_digitavel: null,
                pix_copia_cola: null,
            })));
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Não foi possível gerar as parcelas");
        }
    }

    const set = (i: number, p: Partial<ParcelaForm>) => onChange(parcelas.map((x, j) => (j === i ? { ...x, ...p } : x)));
    const diferenca = diferencaCentavos(premio, parcelas.map((p) => p.valor));

    return (
        <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: "center" }}>
                <TextField size="small" label="Quantidade" type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} sx={{ width: 120 }} />
                <TextField size="small" label="1º vencimento" type="date" value={primeiro} onChange={(e) => setPrimeiro(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <Button variant="outlined" disabled={!premio || !primeiro} onClick={gerar}>Gerar parcelas</Button>
            </Stack>
            {erro && <Alert severity="error">{erro}</Alert>}
            {parcelas.map((p, i) => (
                <Stack key={i} direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ alignItems: "center" }}>
                    <TextField size="small" label="Nº" value={p.numero} sx={{ width: 70 }} slotProps={{ htmlInput: { readOnly: true } }} />
                    <TextField size="small" label="Vencimento" type="date" value={p.vencimento} onChange={(e) => set(i, { vencimento: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                    <TextField size="small" label="Valor (R$)" value={num(p.valor)} onChange={(e) => set(i, { valor: parseValorBR(e.target.value) ?? 0 })} sx={{ width: 130 }} />
                    <TextField size="small" label="Comissão esperada (R$)" value={num(p.comissao_esperada)} onChange={(e) => set(i, { comissao_esperada: parseValorBR(e.target.value) })} sx={{ width: 180 }} />
                    {mostrarBoleto && (
                        <>
                            <TextField size="small" label="Linha digitável" value={p.linha_digitavel ?? ""} onChange={(e) => set(i, { linha_digitavel: e.target.value || null })} sx={{ flex: 1 }} />
                            <TextField size="small" label="PIX copia e cola" value={p.pix_copia_cola ?? ""} onChange={(e) => set(i, { pix_copia_cola: e.target.value || null })} sx={{ flex: 1 }} />
                        </>
                    )}
                    <IconButton size="small" aria-label="Remover parcela" onClick={() => onChange(parcelas.filter((_, j) => j !== i).map((x, j) => ({ ...x, numero: j + 1 })))}>
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                </Stack>
            ))}
            {parcelas.length > 0 && diferenca !== 0 && (
                <Alert severity="info">
                    A soma das parcelas difere do prêmio em {formatBRL(Math.abs(diferenca) / 100)} ({diferenca > 0 ? "a mais" : "a menos"}). Pode ser juros do parcelamento — confira antes de salvar.
                </Alert>
            )}
        </Stack>
    );
}
