'use client';
import { useState } from "react";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import DealNotesTab from "./DealNotesTab";
import DealHistoryTab from "./DealHistoryTab";
import DealAttachmentsTab from "./DealAttachmentsTab";

type Aba = "anotacoes" | "historico" | "anexos";

export default function DealActivityPanel({ negocioId }: { negocioId: string }) {
    const [aba, setAba] = useState<Aba>("anotacoes");

    return (
        <Paper variant="outlined" sx={{ borderRadius: 3 }}>
            <Tabs value={aba} onChange={(_, v) => setAba(v)} sx={{ px: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                <Tab value="anotacoes" label="Anotações" />
                <Tab value="historico" label="Histórico" />
                <Tab value="anexos" label="Anexos" />
            </Tabs>
            <Box sx={{ p: 2.75 }}>
                {aba === "anotacoes" && <DealNotesTab negocioId={negocioId} />}
                {aba === "historico" && <DealHistoryTab negocioId={negocioId} />}
                {aba === "anexos" && <DealAttachmentsTab negocioId={negocioId} />}
            </Box>
        </Paper>
    );
}
