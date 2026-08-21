'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import WorkOutlineIcon from '@mui/icons-material/WorkOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { initials, avatarColor } from '@/app/ui/design/avatar';
import { useColorMode } from '@/app/ui/design/ThemeRegistry';
import { criarConta } from '@/app/lib/actions';
import { createClient } from '@/utils/supabase/client';

type Account = {
    id: string;
    nome: string;
    logo: string | null;
    papel: 'owner' | 'guest';
    corretoraId: string | null;
    onboardingConcluido: boolean;
};

function AccountLogo({ nome, logo }: { nome: string; logo: string | null }) {
    return (
        <Avatar src={logo ?? undefined} sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: avatarColor(nome), fontWeight: 800 }}>
            {initials(nome)}
        </Avatar>
    );
}

function AccountCard({ acc, onOpen }: { acc: Account; onOpen: (acc: Account) => void }) {
    return (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardActionArea onClick={() => onOpen(acc)} sx={{ p: 2.5, height: '100%' }}>
                <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center', mb: 2 }}>
                    <AccountLogo nome={acc.nome} logo={acc.logo} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 800, fontSize: 15.5 }}>{acc.nome}</Typography>
                        <Typography noWrap variant="caption" color="text.secondary">ID {acc.id.slice(0, 8)}</Typography>
                    </Box>
                </Stack>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Chip
                        size="small"
                        icon={acc.papel === 'owner' ? <WorkOutlineIcon /> : <GroupsOutlinedIcon />}
                        label={acc.papel === 'owner' ? 'Proprietário' : 'Convidado'}
                        color={acc.papel === 'owner' ? 'secondary' : 'default'}
                        variant={acc.papel === 'owner' ? 'filled' : 'outlined'}
                    />
                    <ChevronRightIcon color="disabled" />
                </Stack>
            </CardActionArea>
        </Card>
    );
}

function NewAccountModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
    const [nome, setNome] = useState('');
    const [erro, setErro] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const valid = nome.trim().length > 1;

    async function submit() {
        if (!valid) return;
        setLoading(true);
        const result = await criarConta({ nome: nome.trim() });
        setLoading(false);

        if (result.error) {
            setErro(result.error);
            return;
        }
        setNome('');
        onCreated();
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Criar conta
                <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>
            <DialogContent>
                <TextField
                    label="Nome da conta"
                    placeholder="Ex: Santolin Consultoria"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    error={!!erro}
                    helperText={erro}
                    autoFocus
                    fullWidth
                    sx={{ mt: 1 }}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button variant="contained" startIcon={<AddIcon />} disabled={!valid || loading} onClick={submit}>
                    {loading ? 'Criando...' : 'Criar conta'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default function AccountsPage({ accounts, nomeUsuario }: { accounts: Account[]; nomeUsuario: string }) {
    const router = useRouter();
    const { mode, toggle } = useColorMode();
    const [modalOpen, setModalOpen] = useState(false);

    function openAccount(acc: Account) {
        if (!acc.corretoraId) {
            alert('Essa conta ainda não tem uma corretora associada.');
            return;
        }
        if (!acc.onboardingConcluido) {
            router.push(`/onboarding/${acc.corretoraId}`);
            return;
        }
        router.push(`/corretoras/${acc.corretoraId}/funis`);
    }

    function accountCreated() {
        setModalOpen(false);
        router.refresh();
    }

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        // Navegação completa (não router.push): descarta o cache de rotas do
        // Next.js, senão o botão "voltar" do navegador pode reexibir a página
        // autenticada em cache em vez de pedir uma nova ao servidor.
        window.location.href = '/auth';
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
            <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', px: 5, py: 2.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}
            >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>
                    <CloudOutlinedIcon sx={{ color: 'secondary.main' }} />
                    <span>imsure</span>
                </Stack>
                <Box sx={{ flex: 1 }} />
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: avatarColor(nomeUsuario), fontSize: 12 }}>{initials(nomeUsuario)}</Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>{nomeUsuario}</Typography>
                </Stack>
                <IconButton onClick={toggle} title="Alternar tema">
                    {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </IconButton>
                <IconButton onClick={handleLogout} title="Sair">
                    <LogoutIcon fontSize="small" />
                </IconButton>
            </Stack>

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', px: 3, py: 7 }}>
                {accounts.length === 0 ? (
                    <Box sx={{ m: 'auto', textAlign: 'center', maxWidth: 420 }}>
                        <Box sx={{ width: 76, height: 76, borderRadius: 3, bgcolor: 'action.hover', display: 'grid', placeItems: 'center', mx: 'auto', mb: 2.5 }}>
                            <LayersOutlinedIcon sx={{ fontSize: 34, color: 'text.disabled' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Você ainda não possui uma conta</Typography>
                        <Typography color="text.secondary" sx={{ mb: 3 }}>
                            Crie sua conta para começar a gerenciar prospecções, negociações e renovações no Imsure.
                        </Typography>
                        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
                            Criar minha conta
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ width: '100%', maxWidth: 900 }}>
                        <Stack direction="row" sx={{ alignItems: 'flex-end', justifyContent: 'space-between', mb: 4 }}>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Suas contas</Typography>
                                <Typography color="text.secondary">Escolha uma conta para continuar, ou crie uma nova.</Typography>
                            </Box>
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
                                Criar conta
                            </Button>
                        </Stack>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2.25 }}>
                            {accounts.map((acc) => <AccountCard key={acc.id} acc={acc} onOpen={openAccount} />)}
                            <Card
                                variant="outlined"
                                sx={{ borderRadius: 3, borderStyle: 'dashed', bgcolor: 'transparent' }}
                            >
                                <CardActionArea onClick={() => setModalOpen(true)} sx={{ height: '100%', minHeight: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.25 }}>
                                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'action.hover', display: 'grid', placeItems: 'center' }}>
                                        <AddIcon />
                                    </Box>
                                    <Typography sx={{ fontWeight: 700, color: 'text.secondary' }}>Criar nova conta</Typography>
                                </CardActionArea>
                            </Card>
                        </Box>
                    </Box>
                )}
            </Box>

            <NewAccountModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={accountCreated} />
        </Box>
    );
}
