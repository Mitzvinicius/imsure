'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import { criarSinistro } from "@/app/lib/actions-seguros";
import { tiposSinistroDoRamo } from "@/app/lib/seguros/sinistros";
import { hojeSaoPaulo } from "@/app/lib/seguros/datas";

export type ApoliceOpcao = {
    id: string;
    numero: string;
    ramo: string;
    contato: { nome: string } | null;
    bens_auto: { id: string; placa: string | null; modelo: string | null }[];
    bens_residencial: { id: string; logradouro: string | null; numero: string | null }[];
};

function bemUnico(a: ApoliceOpcao | null): string {
    return a && a.bens_auto.length + a.bens_residencial.length === 1 ? (a.bens_auto[0]?.id ?? a.bens_residencial[0].id) : "";
}

export default function NovoSinistroForm({ corretoraId, apolices, apoliceInicialId }: { corretoraId: string; apolices: ApoliceOpcao[]; apoliceInicialId: string | null }) {
    const router = useRouter();
    const apoliceInicial = apolices.find((a) => a.id === apoliceInicialId) ?? null;
    const [apolice, setApolice] = useState<ApoliceOpcao | null>(apoliceInicial);
    const [bemId, setBemId] = useState(bemUnico(apoliceInicial));
    const [data, setData] = useState(hojeSaoPaulo());
    const [tipo, setTipo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [numeroSeguradora, setNumeroSeguradora] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);

    const bens = apolice
        ? [
            ...apolice.bens_auto.map((b) => ({ id: b.id, rotulo: [b.modelo, b.placa].filter(Boolean).join(" · ") || "Veículo", tabela: "auto" as const })),
            ...apolice.bens_residencial.map((b) => ({ id: b.id, rotulo: [b.logradouro, b.numero].filter(Boolean).join(", ") || "Imóvel", tabela: "residencial" as const })),
        ]
        : [];

    async function salvar() {
        if (!apolice) { setErro("Escolha a apólice"); return; }
        setErro(null);
        setSalvando(true);
        const bem = bens.find((b) => b.id === bemId);
        const r = await criarSinistro({
            apoliceId: apolice.id,
            bemAutoId: bem?.tabela === "auto" ? bem.id : null,
            bemResidencialId: bem?.tabela === "residencial" ? bem.id : null,
            dataOcorrencia: data,
            tipo,
            descricao: descricao || null,
            numeroSeguradora: numeroSeguradora || null,
        });
        setSalvando(false);
        if (r.error || !r.sinistroId) { setErro(r.error ?? "Erro ao salvar"); return; }
        router.push(`/corretoras/${corretoraId}/sinistros/${r.sinistroId}`);
    }

    return (
        <Box sx={{ p: 3, maxWidth: 800 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Abrir sinistro</Typography>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                    <Autocomplete
                        options={apolices}
                        value={apolice}
                        getOptionLabel={(a) => `${a.numero} · ${a.contato?.nome ?? ""} · ${a.ramo}`}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        onChange={(_e, a) => {
                            setApolice(a);
                            setTipo("");
                            setBemId(bemUnico(a));
                        }}
                        renderInput={(p) => <TextField {...p} label="Apólice" required />}
                    />
                    {bens.length > 1 && (
                        <TextField select label="Bem envolvido" value={bemId} onChange={(e) => setBemId(e.target.value)}>
                            {bens.map((b) => <MenuItem key={b.id} value={b.id}>{b.rotulo}</MenuItem>)}
                        </TextField>
                    )}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <TextField label="Data da ocorrência" type="date" required value={data} onChange={(e) => setData(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                        <TextField select label="Tipo" required value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={!apolice} sx={{ flex: 1 }}>
                            {(apolice ? tiposSinistroDoRamo(apolice.ramo) : []).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </TextField>
                        <TextField label="Nº do sinistro na seguradora" value={numeroSeguradora} onChange={(e) => setNumeroSeguradora(e.target.value)} sx={{ flex: 1 }} />
                    </Stack>
                    <TextField label="Descrição" multiline minRows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                    {erro && <Alert severity="error">{erro}</Alert>}
                    <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end" }}>
                        <Button onClick={() => router.back()}>Cancelar</Button>
                        <Button variant="contained" disabled={salvando} onClick={salvar}>{salvando ? "Salvando..." : "Abrir sinistro"}</Button>
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
}
