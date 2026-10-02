'use client';
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { LABEL_STATUS_SINISTRO, type StatusSinistro } from "@/app/lib/seguros/sinistros";
import { formatData } from "@/app/lib/seguros/datas";
import type { SinistroLinha } from "@/app/lib/seguros/types";

export default function SinistrosPage({ corretoraId, sinistros }: { corretoraId: string; sinistros: SinistroLinha[] }) {
    const router = useRouter();
    const [status, setStatus] = useState<StatusSinistro | "">("");
    const [ramo, setRamo] = useState("");
    const ramos = useMemo(() => [...new Set(sinistros.map((s) => s.ramo))].sort(), [sinistros]);
    const filtrados = sinistros.filter((s) => (!status || s.status === status) && (!ramo || s.ramo === ramo));

    const colunas: GridColDef<SinistroLinha>[] = [
        { field: "data_ocorrencia", headerName: "Ocorrência", flex: 0.8, valueFormatter: (v: string) => formatData(v) },
        { field: "contato_nome", headerName: "Cliente", flex: 1.3 },
        { field: "apolice_numero", headerName: "Apólice", flex: 0.9 },
        { field: "ramo", headerName: "Ramo", flex: 1 },
        { field: "tipo", headerName: "Tipo", flex: 1 },
        { field: "numero_seguradora", headerName: "Nº seguradora", flex: 0.9, valueFormatter: (v: string | null) => v ?? "—" },
        { field: "status", headerName: "Status", flex: 1, renderCell: ({ row }) => <Chip size="small" label={LABEL_STATUS_SINISTRO[row.status]} /> },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Sinistros</Typography>
                <Button variant="contained" onClick={() => router.push(`/corretoras/${corretoraId}/sinistros/novo`)}>Abrir sinistro</Button>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
                <TextField size="small" select label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusSinistro | "")} sx={{ minWidth: 220 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {(Object.keys(LABEL_STATUS_SINISTRO) as StatusSinistro[]).map((s) => <MenuItem key={s} value={s}>{LABEL_STATUS_SINISTRO[s]}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Ramo" value={ramo} onChange={(e) => setRamo(e.target.value)} sx={{ minWidth: 220 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {ramos.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
            </Stack>
            <Paper variant="outlined">
                <DataGrid
                    rows={filtrados}
                    columns={colunas}
                    autoHeight
                    disableRowSelectionOnClick
                    onRowClick={({ row }) => router.push(`/corretoras/${corretoraId}/sinistros/${row.id}`)}
                    localeText={{ noRowsLabel: "Nenhum sinistro encontrado" }}
                    sx={{ border: 0, "& .MuiDataGrid-row": { cursor: "pointer" } }}
                />
            </Paper>
        </Box>
    );
}
