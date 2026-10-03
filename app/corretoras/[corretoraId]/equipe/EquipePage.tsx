'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { usePermissoes } from "@/app/ui/design/PermissoesContext";
import AbaMembros from "./AbaMembros";
import AbaEquipes from "./AbaEquipes";
import AbaCargos from "./AbaCargos";
import type { Cargo, ConvitePendente, Equipe, Membro, UsoPlano } from "./tipos";

type Aba = "membros" | "equipes" | "cargos";

export default function EquipePage(props: {
    corretoraId: string;
    corretoraNome: string;
    membros: Membro[];
    cargos: Cargo[];
    convites: ConvitePendente[];
    equipes: Equipe[];
    uso: UsoPlano;
    abaInicial: Aba;
}) {
    const router = useRouter();
    const { pode } = usePermissoes();
    const [aba, setAba] = useState<Aba>(props.abaInicial);

    function trocar(v: Aba) {
        setAba(v);
        router.replace(`?aba=${v}`, { scroll: false });
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1100 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>Equipe</Typography>
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Tabs value={aba} onChange={(_e, v) => trocar(v)} sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}>
                    <Tab value="membros" label={`Membros (${props.membros.filter((m) => m.ativo).length})`} />
                    <Tab value="equipes" label={`Equipes (${props.equipes.length})`} />
                    <Tab value="cargos" label="Cargos" />
                </Tabs>
                <Box sx={{ p: 3 }}>
                    {aba === "membros" && (
                        <AbaMembros corretoraId={props.corretoraId} corretoraNome={props.corretoraNome} membros={props.membros} cargos={props.cargos}
                            convites={props.convites} uso={props.uso} podeGerenciar={pode("equipe.membros")} podeTransferir={pode("carteira.transferir")} />
                    )}
                    {aba === "equipes" && (
                        <AbaEquipes corretoraId={props.corretoraId} equipes={props.equipes} membros={props.membros.filter((m) => m.ativo)} podeGerenciar={pode("equipe.equipes")} />
                    )}
                    {aba === "cargos" && <AbaCargos cargos={props.cargos} />}
                </Box>
            </Paper>
        </Box>
    );
}
