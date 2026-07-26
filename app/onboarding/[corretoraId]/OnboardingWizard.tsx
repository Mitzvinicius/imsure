'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
    atualizarDadosCorretora,
    salvarRamosAtuacao,
    salvarFluxoVendas,
    selecionarPlano,
    concluirOnboarding,
} from '@/app/lib/actions';

const RAMOS_OPCOES = [
    'Automóvel', 'Vida Individual', 'Residencial',
    'Resp. Civil Profissional', 'Empresarial', 'Saúde',
];

const ETAPAS_PADRAO = [
    'Prospecção / Renovações', 'Contato feito', 'Em negociação', 'Arquivado',
];

type Plano = {
    id: string;
    nome: string;
    preco_mensal: string | number | null;
    permite_cargo_customizado: boolean;
    permite_acesso_global: boolean;
    limite_fluxos_por_tenant: number | null;
    limite_tenants: number;
};

type Props = {
    corretoraId: string;
    nomeInicial: string;
    cnpjInicial: string;
    registroSusepInicial: string;
    ramosIniciais: string[];
    etapasIniciais: string[];
    planoAtualId: string | null;
    planos: Plano[];
};

function formatPreco(v: string | number | null) {
    const n = Number(v ?? 0);
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OnboardingWizard({
    corretoraId,
    nomeInicial,
    cnpjInicial,
    registroSusepInicial,
    ramosIniciais,
    etapasIniciais,
    planoAtualId,
    planos,
}: Props) {
    const router = useRouter();

    const stepInicial = (() => {
        if (!cnpjInicial && !registroSusepInicial) return 1;
        if (ramosIniciais.length === 0) return 2;
        if (etapasIniciais.length === 0) return 3;
        return 4;
    })();

    const [step, setStep] = useState(stepInicial);
    const [saving, setSaving] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const [nome, setNome] = useState(nomeInicial);
    const [cnpj, setCnpj] = useState(cnpjInicial);
    const [registroSusep, setRegistroSusep] = useState(registroSusepInicial);
    const [ramos, setRamos] = useState<string[]>(ramosIniciais);
    const [etapas, setEtapas] = useState<string[]>(
        etapasIniciais.length > 0 ? etapasIniciais : ETAPAS_PADRAO
    );
    const [planoId, setPlanoId] = useState<string | null>(planoAtualId);

    function toggleRamo(r: string) {
        setRamos((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
    }
    function renomearEtapa(i: number, valor: string) {
        setEtapas((prev) => prev.map((e, idx) => (idx === i ? valor : e)));
    }
    function moverEtapa(i: number, dir: -1 | 1) {
        setEtapas((prev) => {
            const j = i + dir;
            if (j < 0 || j >= prev.length) return prev;
            const copia = [...prev];
            [copia[i], copia[j]] = [copia[j], copia[i]];
            return copia;
        });
    }
    function removerEtapa(i: number) {
        setEtapas((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));
    }

    async function avancarEtapa1() {
        setErro(null);
        if (!nome.trim()) { setErro('Informe o nome da corretora'); return; }
        setSaving(true);
        const r = await atualizarDadosCorretora({ corretoraId, nome: nome.trim(), cnpj, registroSusep });
        setSaving(false);
        if (r.error) { setErro(r.error); return; }
        setStep(2);
    }
    async function avancarEtapa2() {
        setErro(null);
        setSaving(true);
        const r = await salvarRamosAtuacao({ corretoraId, ramos });
        setSaving(false);
        if (r.error) { setErro(r.error); return; }
        setStep(3);
    }
    async function avancarEtapa3() {
        setErro(null);
        setSaving(true);
        const r = await salvarFluxoVendas({ corretoraId, etapas });
        setSaving(false);
        if (r.error) { setErro(r.error); return; }
        setStep(4);
    }
    async function avancarEtapa4() {
        setErro(null);
        if (!planoId) { setErro('Escolha um plano para continuar'); return; }
        setSaving(true);
        const r = await selecionarPlano({ corretoraId, planoId });
        setSaving(false);
        if (r.error) { setErro(r.error); return; }
        setStep(5);
    }
    async function concluir() {
        setErro(null);
        setSaving(true);
        const r = await concluirOnboarding({ corretoraId });
        setSaving(false);
        if (r.error) { setErro(r.error); return; }
        router.push('/contas');
    }

    const planoEscolhido = planos.find((p) => p.id === planoId);
    const progresso = (step / 5) * 100;

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
            <LinearProgress
                variant="determinate"
                value={progresso}
                sx={{ position: 'fixed', top: 0, left: 0, right: 0, height: 4, zIndex: 10 }}
            />

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', position: 'fixed', top: 24, left: 32 }}>
                <CloudOutlinedIcon sx={{ color: 'secondary.main' }} />
                <Typography sx={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>imsure</Typography>
            </Stack>

            {step > 1 && (
                <IconButton
                    onClick={() => setStep((s) => s - 1)}
                    sx={{ position: 'fixed', bottom: 32, right: 32 }}
                    aria-label="Etapa anterior"
                >
                    <ArrowBackIcon />
                </IconButton>
            )}

            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 3 }}>
                <Box sx={{ width: '100%', maxWidth: 560 }}>
                    {step === 1 && (
                        <>
                            <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1.5, fontSize: { xs: 28, sm: 38 } }}>
                                Vamos deixar sua corretora com a cara certa
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 4 }}>
                                Esses dados aparecem nos documentos e telas do sistema.
                            </Typography>
                            <Stack spacing={2.5} sx={{ mb: 4 }}>
                                <TextField label="Nome da corretora" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus fullWidth />
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <TextField label="CNPJ" placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} fullWidth />
                                    <TextField label="Registro SUSEP" placeholder="00000000000" value={registroSusep} onChange={(e) => setRegistroSusep(e.target.value)} fullWidth />
                                </Stack>
                            </Stack>
                            {erro && <Typography color="error" sx={{ mb: 2 }}>{erro}</Typography>}
                            <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} disabled={saving} onClick={avancarEtapa1}>
                                {saving ? 'Salvando...' : 'Continuar'}
                            </Button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1.5, fontSize: { xs: 28, sm: 38 } }}>
                                Em quais ramos vocês atuam?
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 4 }}>
                                Isso ajuda a personalizar as tags e filtros do seu funil de vendas.
                            </Typography>
                            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 4 }}>
                                {RAMOS_OPCOES.map((r) => {
                                    const on = ramos.includes(r);
                                    return (
                                        <Chip
                                            key={r}
                                            label={r}
                                            clickable
                                            color={on ? 'primary' : 'default'}
                                            variant={on ? 'filled' : 'outlined'}
                                            icon={on ? <CheckIcon /> : undefined}
                                            onClick={() => toggleRamo(r)}
                                        />
                                    );
                                })}
                            </Stack>
                            {erro && <Typography color="error" sx={{ mb: 2 }}>{erro}</Typography>}
                            <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} disabled={saving} onClick={avancarEtapa2}>
                                {saving ? 'Salvando...' : 'Continuar'}
                            </Button>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1.5, fontSize: { xs: 28, sm: 38 } }}>
                                Esse vai ser o coração do seu dia a dia
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 4 }}>
                                Já deixamos um funil pronto — deixa do seu jeito, renomeando, reordenando ou adicionando etapas.
                            </Typography>
                            <Stack spacing={1} sx={{ mb: 2 }}>
                                {etapas.map((et, i) => (
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} key={i}>
                                        <Stack>
                                            <IconButton size="small" onClick={() => moverEtapa(i, -1)} disabled={i === 0}>
                                                <KeyboardArrowUpIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => moverEtapa(i, 1)} disabled={i === etapas.length - 1}>
                                                <KeyboardArrowDownIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                        <TextField size="small" fullWidth value={et} onChange={(e) => renomearEtapa(i, e.target.value)} />
                                        <IconButton onClick={() => removerEtapa(i)} disabled={etapas.length <= 2}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                ))}
                            </Stack>
                            <Button startIcon={<AddIcon />} onClick={() => setEtapas((p) => [...p, 'Nova etapa'])} sx={{ mb: 3 }}>
                                Adicionar etapa
                            </Button>
                            {erro && <Typography color="error" sx={{ mb: 2 }}>{erro}</Typography>}
                            <Box>
                                <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} disabled={saving} onClick={avancarEtapa3}>
                                    {saving ? 'Salvando...' : 'Continuar'}
                                </Button>
                            </Box>
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1.5, fontSize: { xs: 28, sm: 38 } }}>
                                Escolha o plano que combina com sua operação
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 4 }}>
                                Dá pra trocar de plano depois, a qualquer momento.
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
                                {planos.map((p) => {
                                    const on = planoId === p.id;
                                    return (
                                        <Card key={p.id} variant="outlined" sx={{ flex: 1, borderColor: on ? 'primary.main' : undefined, borderWidth: on ? 2 : 1 }}>
                                            <CardActionArea onClick={() => setPlanoId(p.id)} sx={{ height: '100%' }}>
                                                <CardContent>
                                                    <Typography sx={{ fontWeight: 800 }}>{p.nome}</Typography>
                                                    <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 1 }}>
                                                        R$ {formatPreco(p.preco_mensal)}<Typography component="span" variant="caption" color="text.secondary">/mês</Typography>
                                                    </Typography>
                                                    <Stack spacing={0.5}>
                                                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                                            <CheckIcon fontSize="small" color="success" />
                                                            <Typography variant="caption" color="text.secondary">Até {p.limite_tenants} corretora{p.limite_tenants > 1 ? 's' : ''}</Typography>
                                                        </Stack>
                                                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                                            <CheckIcon fontSize="small" color="success" />
                                                            <Typography variant="caption" color="text.secondary">
                                                                {p.limite_fluxos_por_tenant ? `Até ${p.limite_fluxos_por_tenant} funis` : 'Funis ilimitados'}
                                                            </Typography>
                                                        </Stack>
                                                        {p.permite_cargo_customizado && (
                                                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                                                <CheckIcon fontSize="small" color="success" />
                                                                <Typography variant="caption" color="text.secondary">Cargos customizados</Typography>
                                                            </Stack>
                                                        )}
                                                        {p.permite_acesso_global && (
                                                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                                                <CheckIcon fontSize="small" color="success" />
                                                                <Typography variant="caption" color="text.secondary">Acesso global (sócio)</Typography>
                                                            </Stack>
                                                        )}
                                                    </Stack>
                                                </CardContent>
                                            </CardActionArea>
                                        </Card>
                                    );
                                })}
                            </Stack>
                            {erro && <Typography color="error" sx={{ mb: 2 }}>{erro}</Typography>}
                            <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} disabled={saving} onClick={avancarEtapa4}>
                                {saving ? 'Salvando...' : 'Continuar'}
                            </Button>
                        </>
                    )}

                    {step === 5 && (
                        <>
                            <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1.5, fontSize: { xs: 28, sm: 38 } }}>
                                Tudo pronto!
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 4 }}>
                                Confere como ficou o seu funil antes de começar.
                            </Typography>
                            <Stack spacing={3} sx={{ mb: 4 }}>
                                <Box>
                                    <Typography variant="overline" color="text.secondary">Corretora</Typography>
                                    <Typography sx={{ fontWeight: 700 }}>{nome}{cnpj ? ` · CNPJ ${cnpj}` : ''}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="overline" color="text.secondary">Ramos de atuação</Typography>
                                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                                        {ramos.map((r) => <Chip key={r} label={r} size="small" color="primary" variant="outlined" />)}
                                    </Stack>
                                </Box>
                                <Box>
                                    <Typography variant="overline" color="text.secondary">Plano</Typography>
                                    <Typography sx={{ fontWeight: 700 }}>
                                        {planoEscolhido?.nome} · R$ {formatPreco(planoEscolhido?.preco_mensal ?? null)}/mês
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="overline" color="text.secondary">Seu funil de vendas</Typography>
                                    <Stack direction="row" spacing={1} sx={{ mt: 0.5, overflowX: 'auto', pb: 1 }}>
                                        {etapas.map((et) => (
                                            <Box key={et} sx={{ flex: '1 0 120px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.2 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 800 }} noWrap>{et}</Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            </Stack>
                            {erro && <Typography color="error" sx={{ mb: 2 }}>{erro}</Typography>}
                            <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} disabled={saving} onClick={concluir}>
                                {saving ? 'Preparando...' : 'Começar a usar o Imsure'}
                            </Button>
                        </>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
