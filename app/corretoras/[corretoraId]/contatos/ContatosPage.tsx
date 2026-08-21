'use client';
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ContactsTable from "@/app/ui/contacts/table";
import { Contact } from "@/app/lib/definitions";

export default function ContatosPage({ contacts }: { contacts: Contact[] }) {
    return (
        <Box sx={{ p: 4, flex: 1, minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 0.5 }}>
                Contatos
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Pessoas cadastradas nessa corretora.
            </Typography>
            <ContactsTable contacts={contacts} />
        </Box>
    );
}
