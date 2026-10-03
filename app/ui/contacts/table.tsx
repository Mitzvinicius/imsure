'use client';

import { useParams, useRouter } from "next/navigation";
import Paper from "@mui/material/Paper";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { Contact } from "@/app/lib/definitions";

const SITUACAO_LABEL: Record<Contact["situacao"], string> = {
    cliente: "Cliente",
    lead: "Lead",
    "ex-cliente": "Ex-cliente",
};

export default function ContactsTable({ contacts }: { contacts: Contact[] }) {
    const router = useRouter();
    const { corretoraId } = useParams<{ corretoraId: string }>();
    const abrir = (id: string) => router.push(`/corretoras/${corretoraId}/contatos/${id}`);

    const columns: GridColDef<Contact>[] = [
        { field: "nome", headerName: "Nome", flex: 1, headerAlign: "center" },
        { field: "email", headerName: "E-mail", flex: 1, headerAlign: "center" },
        { field: "telefone", headerName: "Telefone", flex: 1, headerAlign: "center" },
        {
            field: "situacao",
            headerName: "Status",
            headerAlign: "center",
            valueFormatter: (value: Contact["situacao"]) => SITUACAO_LABEL[value] ?? value,
        },
        {
            field: "acoes",
            headerName: "Ações",
            headerAlign: "center",
            sortable: false,
            filterable: false,
            renderCell: ({ row }) => (
                <Stack direction="row">
                    <IconButton size="small" title="Ver contato" onClick={(e) => { e.stopPropagation(); abrir(row.id); }}><VisibilityOutlinedIcon fontSize="small" /></IconButton>
                    <IconButton size="small" title="Excluir contato" onClick={(e) => e.stopPropagation()}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Stack>
            ),
        },
    ];

    return (
        <Paper variant="outlined" sx={{ height: 480, width: "100%", borderRadius: 3 }}>
            <DataGrid
                autoHeight={false}
                rows={contacts}
                columns={columns}
                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                pageSizeOptions={[10, 25]}
                checkboxSelection
                disableRowSelectionOnClick
                onRowClick={({ row }) => abrir(row.id)}
                sx={{ border: 0, "& .MuiDataGrid-row": { cursor: "pointer" } }}
            />
        </Paper>
    );
}
