'use client';
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import AddIcon from "@mui/icons-material/Add";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { COR_STATUS_APOLICE, LABEL_STATUS_APOLICE, type StatusApolice } from "@/app/lib/seguros/status";
import { formatData, somarDias } from "@/app/lib/seguros/datas";
import type { ApoliceLinha } from "@/app/lib/seguros/types";
import { formatBRL } from "../funis/constants";

export default function ApolicesPage({ corretoraId, apolices, hoje }: { corretoraId: string; apolices: ApoliceLinha[]; hoje: string }) {
    const router = useRouter();
    const [busca, setBusca] = useState("");
    const [ramo, setRamo] = useState("");
    const [seguradora, setSeguradora] = useState("");
    const [status, setStatus] = useState<StatusApolice | "">("");
    const [venceEm, setVenceEm] = useState("");

    const ramos = useMemo(() => [...new Set(apolices.map((a) => a.ramo))].sort(), [apolices]);
    const seguradoras = useMemo(() => [...new Set(apolices.map((a) => a.seguradora_nome))].sort(), [apolices]);

    const filtradas = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        const limite = venceEm ? somarDias(hoje, Number(venceEm)) : null;
        return apolices.filter((a) => {
            if (ramo && a.ramo !== ramo) return false;
            if (seguradora && a.seguradora_nome !== seguradora) return false;
            if (status && a.status !== status) return false;
            if (limite && (a.fim_vigencia < hoje || a.fim_vigencia > limite)) return false;
            if (!termo) return true;
            return [a.contato_nome, a.numero, ...a.placas, ...a.chassis].some((v) => v.toLowerCase().includes(termo));
        });
    }, [apolices, busca, ramo, seguradora, status, venceEm, hoje]);

    const colunas: GridColDef<ApoliceLinha>[] = [
        { field: "contato_nome", headerName: "Cliente", flex: 1.4 },
        { field: "seguradora_nome", headerName: "Seguradora", flex: 1 },
        { field: "ramo", headerName: "Ramo", flex: 1 },
        { field: "numero", headerName: "Número", flex: 1 },
        {
            field: "fim_vigencia", headerName: "Vigência", flex: 1.2,
            valueGetter: (_v, row) => `${formatData(row.inicio_vigencia)} – ${formatData(row.fim_vigencia)}`,
        },
        { field: "premio", headerName: "Prêmio", flex: 0.9, valueFormatter: (v: number | null) => (v == null ? "—" : formatBRL(v)) },
        {
            field: "status", headerName: "Status", flex: 0.9,
            renderCell: ({ row }) => <Chip size="small" label={LABEL_STATUS_APOLICE[row.status]} color={COR_STATUS_APOLICE[row.status]} />,
        },
        { field: "proxima_parcela", headerName: "Próx. parcela", flex: 0.9, valueFormatter: (v: string | null) => formatData(v) },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Apólices</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push(`/corretoras/${corretoraId}/apolices/nova`)}>
                    Nova apólice
                </Button>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }}>
                <TextField size="small" label="Buscar cliente, número, placa ou chassi" value={busca} onChange={(e) => setBusca(e.target.value)} sx={{ flex: 2 }} />
                <TextField size="small" select label="Ramo" value={ramo} onChange={(e) => setRamo(e.target.value)} sx={{ flex: 1 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {ramos.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Seguradora" value={seguradora} onChange={(e) => setSeguradora(e.target.value)} sx={{ flex: 1 }}>
                    <MenuItem value="">Todas</MenuItem>
                    {seguradoras.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusApolice | "")} sx={{ flex: 1 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {(Object.keys(LABEL_STATUS_APOLICE) as StatusApolice[]).map((s) => <MenuItem key={s} value={s}>{LABEL_STATUS_APOLICE[s]}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Vence em" value={venceEm} onChange={(e) => setVenceEm(e.target.value)} sx={{ flex: 1 }}>
                    <MenuItem value="">Qualquer data</MenuItem>
                    {[30, 60, 90].map((d) => <MenuItem key={d} value={String(d)}>Até {d} dias</MenuItem>)}
                </TextField>
            </Stack>

            <Paper variant="outlined">
                <DataGrid
                    rows={filtradas}
                    columns={colunas}
                    autoHeight
                    disableRowSelectionOnClick
                    onRowClick={({ row }) => router.push(`/corretoras/${corretoraId}/apolices/${row.id}`)}
                    initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                    pageSizeOptions={[25, 50, 100]}
                    localeText={{ noRowsLabel: "Nenhuma apólice encontrada" }}
                    sx={{ border: 0, "& .MuiDataGrid-row": { cursor: "pointer" } }}
                />
            </Paper>
        </Box>
    );
}
