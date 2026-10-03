'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import { atualizarConfiguracoesCorretora } from "@/app/lib/actions-seguros";

export default function ConfiguracoesPage({
    corretoraId,
    diasIniciais,
    etapas,
}: {
    corretoraId: string;
    diasIniciais: number;
    etapas: { id: string; nome: string; renovacao: boolean; emissao: boolean }[];
}) {
    const router = useRouter();
    const [dias, setDias] = useState(String(diasIniciais));
    const [etapaId, setEtapaId] = useState(etapas.find((e) => e.renovacao)?.id ?? "");
    const [etapaEmissaoId, setEtapaEmissaoId] = useState(etapas.find((e) => e.emissao)?.id ?? "");
    const [erro, setErro] = useState<string | null>(null);
    const [salvo, setSalvo] = useState(false);

    async function salvar() {
        setErro(null);
        setSalvo(false);
        const r = await atualizarConfiguracoesCorretora({ corretoraId, diasAntecedencia: Number(dias), etapaRenovacaoId: etapaId || null, etapaEmissaoId: etapaEmissaoId || null });
        if (r.error) { setErro(r.error); return; }
        setSalvo(true);
        router.refresh();
    }

    return (
        <Box sx={{ p: 3, maxWidth: 720 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Configurações</Typography>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Renovações</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Todo dia, o imsure cria um negócio de renovação no funil para cada apólice que vence dentro do prazo abaixo.
                </Typography>
                <Stack spacing={2}>
                    <TextField label="Criar negócio quantos dias antes do vencimento" type="number" value={dias} onChange={(e) => setDias(e.target.value)} slotProps={{ htmlInput: { min: 1, max: 365 } }} />
                    <TextField select label="Etapa do funil onde o negócio entra" value={etapaId} onChange={(e) => setEtapaId(e.target.value)}>
                        <MenuItem value="">Nenhuma (usar a primeira etapa)</MenuItem>
                        {etapas.map((e) => <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>)}
                    </TextField>
                    {!etapaId && <Alert severity="warning">Nenhuma etapa marcada como de renovação — os negócios vão entrar na primeira etapa do funil.</Alert>}
                    {!etapas.length && <Alert severity="info">Esta corretora ainda não tem funil configurado; nenhum negócio de renovação será criado.</Alert>}
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Emissão de apólice</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Quando uma apólice é emitida a partir de um negócio, ele fica como Ganho e vai para esta etapa do funil.
                </Typography>
                <Stack spacing={2}>
                    <TextField select label="Etapa de seguro emitido" value={etapaEmissaoId} onChange={(e) => setEtapaEmissaoId(e.target.value)}>
                        <MenuItem value="">Nenhuma (o negócio fica na etapa atual)</MenuItem>
                        {etapas.map((e) => <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>)}
                    </TextField>
                    {!etapaEmissaoId && <Alert severity="warning">Sem etapa de emissão: o negócio é marcado como Ganho mas não muda de etapa.</Alert>}
                    {erro && <Alert severity="error">{erro}</Alert>}
                    {salvo && <Alert severity="success">Configurações salvas.</Alert>}
                    <Button variant="contained" sx={{ alignSelf: "flex-end" }} onClick={salvar}>Salvar</Button>
                </Stack>
            </Paper>
        </Box>
    );
}
