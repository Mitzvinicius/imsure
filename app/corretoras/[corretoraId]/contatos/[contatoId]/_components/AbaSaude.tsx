'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import { CampoDecimal } from "@/app/ui/design/CamposMascarados";
import { salvarSaude } from "@/app/lib/actions-contatos";
import { calcularImc, classificarImc } from "@/app/lib/contatos/saude";
import { formatData } from "@/app/lib/seguros/datas";
import BarraSalvar from "./BarraSalvar";
import type { Saude } from "../tipos";

export default function AbaSaude({ corretoraId, contatoId, saude }: { corretoraId: string; contatoId: string; saude: Saude }) {
    const router = useRouter();
    const [peso, setPeso] = useState(saude.pesoKg);
    const [altura, setAltura] = useState(saude.alturaM);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [salvo, setSalvo] = useState(false);
    const imc = calcularImc(peso, altura);

    async function salvar() {
        setErro(null);
        setSalvando(true);
        try {
            const r = await salvarSaude({ corretoraId, contatoId, pesoKg: peso, alturaM: altura });
            if (r.error) { setErro(r.error); return; }
            setSalvo(true);
            router.refresh();
        } catch {
            setErro("Não foi possível salvar. Tente de novo.");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "stretch" } }}>
                <Box sx={{ flex: 1, display: "grid", gap: 2 }}>
                    <CampoDecimal label="Peso" valor={peso} onValor={(v) => { setPeso(v); setSalvo(false); }} casas={1} maxDigitos={4} sufixo="kg" />
                    <CampoDecimal label="Altura" valor={altura} onValor={(v) => { setAltura(v); setSalvo(false); }} casas={2} maxDigitos={3} sufixo="m" />
                </Box>
                <Paper variant="outlined" sx={{ flex: 1, p: 2.5, borderRadius: 2, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", bgcolor: "action.hover" }}>
                    <Typography variant="caption" color="text.secondary">IMC</Typography>
                    <Typography sx={{ fontSize: 36, fontWeight: 800, lineHeight: 1.1 }}>{imc != null ? String(imc).replace(".", ",") : "—"}</Typography>
                    <Typography variant="body2" color="text.secondary">{imc != null ? classificarImc(imc) : "Informe peso e altura"}</Typography>
                </Paper>
            </Stack>
            {saude.atualizadoEm && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>Atualizado em {formatData(saude.atualizadoEm)}</Typography>
            )}
            <BarraSalvar salvando={salvando} erro={erro} salvo={salvo} onSalvar={salvar} />
        </>
    );
}
