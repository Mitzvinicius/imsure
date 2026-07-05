'use client';

import {Paper} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import {Contact} from "@/app/lib/definitions";

export default function ContactsTable(contatos: { contacts: Contact[] }) {
const listaDeContatos = contatos.contacts;
const rows = listaDeContatos;
const columns = [
    {field: "name", headerName: "Nome"},
    {field: "email", headerName: "Email"},
    {field: "phone", headerName: "Phone"},
    {field: "situation", headerName: "Status"},
];
const paginationModel = {page: 0, pageSize: 5};
  return (
      <Paper sx={{ height: 400, width: '100%' }}>
        <DataGrid
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