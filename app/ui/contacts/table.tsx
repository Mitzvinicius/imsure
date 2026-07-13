'use client';

import {Paper} from "@mui/material";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import {Button} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import {Contact} from "@/app/lib/definitions";


export default function ContactsTable(contatos: { contacts: Contact[] }) {
const rows = contatos.contacts;
const columns: GridColDef<Contact>[] = [
    {field: "name", headerName: "Nome", headerAlign: "center"},
    {field: "email", headerName: "E-mail", headerAlign: "center"},
    {field: "phone", headerName: "Telefone", headerAlign: "center"},
    {field: "situation", headerName: "Status", headerAlign: "center"},
    {field: "actions", headerName: "Ações", headerAlign: "center", renderCell: () =>
        {return (
        <>
        <Button startIcon ={<VisibilityIcon/>}></Button>
        <Button startIcon ={<DeleteIcon/>}></Button>
    </>
    )
}
},
];
const paginationModel = {page: 0, pageSize: 5};
  return (
      <Paper sx={{ height: 400, width: '100%' }}>
        <DataGrid
            autoHeight={true}
            autosizeOnMount={true}
            rows={rows}
            columns={columns}
            initialState={{ pagination: { paginationModel } }}
            pageSizeOptions={[5, 10]}
            checkboxSelection
            sx={{ border: 0 }}
        />
      </Paper>
  )
}