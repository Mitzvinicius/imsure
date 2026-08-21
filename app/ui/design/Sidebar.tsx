'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LogoutIcon from '@mui/icons-material/Logout';
import type { ContaComCorretora } from '@/app/lib/queries';
import { useColorMode } from './ThemeRegistry';
import { createClient } from '@/utils/supabase/client';

const NAV_ITEMS = [
    { href: 'funis', label: 'Funis', icon: ViewKanbanOutlinedIcon },
    { href: 'contatos', label: 'Contatos', icon: PeopleOutlinedIcon },
];

export default function Sidebar({
    accounts,
    currentCorretoraId,
    currentCorretoraNome,
}: {
    accounts: ContaComCorretora[];
    currentCorretoraId: string;
    currentCorretoraNome: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { mode, toggle } = useColorMode();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    function switchAccount(conta: ContaComCorretora) {
        setAnchorEl(null);
        if (!conta.corretoraId) return;
        if (!conta.onboardingConcluido) {
            router.push(`/onboarding/${conta.corretoraId}`);
            return;
        }
        router.push(`/corretoras/${conta.corretoraId}/funis`);
    }

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = '/auth';
    }

    return (
        <Box
            sx={{
                width: 248,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                position: 'sticky',
                top: 0,
                background: (t) => (t.palette.mode === 'dark'
                    ? 'linear-gradient(180deg, #0a1020, #070b16)'
                    : 'linear-gradient(180deg, #1d2950, #151e3c)'),
                color: '#fff',
            }}
        >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 2.5, py: 2.5 }}>
                <CloudOutlinedIcon sx={{ color: 'secondary.main' }} />
                <Typography sx={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>imsure</Typography>
            </Stack>

            <Box sx={{ px: 2, pb: 1.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', opacity: 0.6, mb: 0.75, px: 0.5 }}>
                    Selecionar empresa
                </Typography>
                <Button
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    fullWidth
                    sx={{
                        justifyContent: 'flex-start',
                        gap: 1,
                        color: '#fff',
                        bgcolor: 'rgba(255,255,255,.06)',
                        border: '1px solid rgba(255,255,255,.1)',
                        px: 1.25,
                        py: 1,
                        '&:hover': { bgcolor: 'rgba(255,255,255,.1)' },
                    }}
                >
                    <BusinessOutlinedIcon sx={{ color: 'secondary.main', fontSize: 18 }} />
                    <Typography noWrap sx={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 600 }}>
                        {currentCorretoraNome}
                    </Typography>
                    <ExpandMoreIcon sx={{ fontSize: 18, opacity: 0.7 }} />
                </Button>
                <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
                    {accounts.map((conta) => (
                        <MenuItem
                            key={conta.id}
                            selected={conta.corretoraId === currentCorretoraId}
                            onClick={() => switchAccount(conta)}
                        >
                            {conta.corretoraNome}
                        </MenuItem>
                    ))}
                    <Divider />
                    <MenuItem onClick={() => { setAnchorEl(null); router.push('/contas'); }}>
                        Ver todas as contas
                    </MenuItem>
                </Menu>
            </Box>

            <Stack component="nav" spacing={0.25} sx={{ flex: 1, px: 1.5, overflowY: 'auto' }}>
                {NAV_ITEMS.map(({ href, label, icon: ItemIcon }) => {
                    const active = pathname?.endsWith(`/${href}`);
                    return (
                        <Button
                            key={href}
                            onClick={() => router.push(`/corretoras/${currentCorretoraId}/${href}`)}
                            startIcon={<ItemIcon />}
                            sx={{
                                justifyContent: 'flex-start',
                                gap: 1,
                                px: 1.5,
                                py: 1.1,
                                borderRadius: 2.5,
                                color: active ? 'secondary.main' : 'rgba(255,255,255,.75)',
                                bgcolor: active ? 'rgba(243,180,39,.12)' : 'transparent',
                                fontSize: 14.5,
                                fontWeight: 600,
                                '&:hover': { bgcolor: 'rgba(255,255,255,.06)' },
                            }}
                        >
                            {label}
                        </Button>
                    );
                })}
            </Stack>

            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 2 }}>
                <IconButton onClick={toggle} size="small" sx={{ color: 'rgba(255,255,255,.75)' }} title="Alternar tema">
                    {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </IconButton>
                <IconButton onClick={handleLogout} size="small" sx={{ color: 'rgba(255,255,255,.75)' }} title="Sair">
                    <LogoutIcon fontSize="small" />
                </IconButton>
            </Stack>
        </Box>
    );
}
