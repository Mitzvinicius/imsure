'use client';
import { useState } from "react";
import { useParams } from "next/navigation";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TarefasEConversa from "@/app/ui/tarefas/TarefasEConversa";
import DealHistoryTab from "./DealHistoryTab";
import DealAttachmentsTab from "./DealAttachmentsTab";

type Aba = "atividades" | "historico" | "anexos";

export default function DealActivityPanel({ negocioId }: { negocioId: string }) {
    const { corretoraId } = useParams<{ corretoraId: string }>();
    const [aba, setAba] = useState<Aba>("atividades");

    return (
        <Paper variant="outlined" sx={{ borderRadius: 3 }}>
            <Tabs value={aba} onChange={(_, v) => setAba(v)} sx={{ px: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                <Tab value="atividades" label="Tarefas e conversa" />
                <Tab value="historico" label="Histórico" />
                <Tab value="anexos" label="Anexos" />
            </Tabs>
            <Box sx={{ p: 2.75 }}>
                {aba === "atividades" && <TarefasEConversa corretoraId={corretoraId} vinculo={{ tipo: "negocio", id: negocioId }} />}
                {aba === "historico" && <DealHistoryTab negocioId={negocioId} />}
                {aba === "anexos" && <DealAttachmentsTab negocioId={negocioId} />}
            </Box>
        </Paper>
    );
}
