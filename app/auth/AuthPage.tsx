'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { GoogleG } from '@/app/ui/design/icons';
import { createNewUser, signIn } from './actions';
import { createClient } from '@/utils/supabase/client';

type Mode = 'signin' | 'signup';

function validEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function AuthPage() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>('signin');
    const [toast, setToast] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    const [si, setSi] = useState({ email: '', senha: '', lembrar: false });
    const [su, setSu] = useState({ nome: '', email: '', senha: '', confirmar: '' });

    async function submitSignin(e: React.FormEvent) {
        e.preventDefault();
        const err: Record<string, string> = {};
        if (!validEmail(si.email)) err.email = 'Informe um e-mail válido';
        if (!si.senha) err.senha = 'Informe sua senha';
        setErrors(err);
        if (Object.keys(err).length > 0) return;

        setLoading(true);
        const result = await signIn({ email: si.email, password: si.senha });
        setLoading(false);

        if (result.error) {
            setErrors({ senha: result.error });
            return;
        }
        router.push('/contas');
    }

    async function submitSignup(e: React.FormEvent) {
        e.preventDefault();
        const err: Record<string, string> = {};
        if (!su.nome.trim()) err.nome = 'Informe seu nome';
        if (!validEmail(su.email)) err.email = 'Informe um e-mail válido';
        if (su.senha.length < 8) err.senha = 'Mínimo de 8 caracteres';
        if (su.confirmar !== su.senha) err.confirmar = 'As senhas não coincidem';
        setErrors(err);
        if (Object.keys(err).length > 0) return;

        setLoading(true);
        const result = await createNewUser({ nome: su.nome, email: su.email, password: su.senha });
        setLoading(false);

        if (result.error) {
            setErrors({ email: result.error });
            return;
        }
        setToast('Conta criada! Verifique seu e-mail para confirmar.');
        switchMode('signin');
    }

    function switchMode(m: Mode) {
        setMode(m);
        setErrors({});
    }

    async function handleGoogleLogin() {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    }

    return (
        <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, bgcolor: 'background.default' }}>
            <Box
                sx={{
                    display: { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    p: 6,
                    color: '#fff',
                    background: (theme) => `linear-gradient(160deg, ${theme.palette.mode === 'dark' ? '#0a1020' : '#1d2950'}, ${theme.palette.mode === 'dark' ? '#070b16' : '#151e3c'})`,
                }}
            >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
                    <CloudOutlinedIcon sx={{ color: 'secondary.main', fontSize: 26 }} />
                    <span>imsure</span>
                </Stack>
                <Box sx={{ maxWidth: 440 }}>
                    <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 2, fontSize: 34, lineHeight: 1.2 }}>
                        O funil de vendas feito para corretoras de seguros.
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,.68)', fontWeight: 500 }}>
                        Gerencie prospecções, negociações e renovações em um só lugar — do primeiro contato ao fechamento.
                    </Typography>
                </Box>
                <Box>
                    <Stack direction="row" spacing={4} sx={{ pt: 3, borderTop: '1px solid rgba(255,255,255,.12)' }}>
                        <Box>
                            <Typography sx={{ fontSize: 22, fontWeight: 800 }}>+2.400</Typography>
                            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>negócios geridos</Typography>
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 22, fontWeight: 800 }}>180+</Typography>
                            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>corretoras ativas</Typography>
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 22, fontWeight: 800 }}>98%</Typography>
                            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>satisfação</Typography>
                        </Box>
                    </Stack>
                    <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,.5)', mt: 2 }}>© 2026 Imsure · Santolin Consultoria</Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
                <Box sx={{ width: '100%', maxWidth: 400 }}>
                    <ToggleButtonGroup
                        value={mode}
                        exclusive
                        onChange={(_, v) => v && switchMode(v)}
                        fullWidth
                        sx={{ mb: 4 }}
                    >
                        <ToggleButton value="signin">Entrar</ToggleButton>
                        <ToggleButton value="signup">Criar conta</ToggleButton>
                    </ToggleButtonGroup>

                    {mode === 'signin' ? (
                        <>
                            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
                                Bem-vindo de volta
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 3, fontSize: 14 }}>
                                Entre com sua conta para acessar o funil de vendas.
                            </Typography>
                            <Box component="form" onSubmit={submitSignin}>
                                <Stack spacing={2.5}>
                                    <TextField
                                        label="E-mail"
                                        type="email"
                                        placeholder="voce@empresa.com"
                                        value={si.email}
                                        onChange={(e) => setSi((p) => ({ ...p, email: e.target.value }))}
                                        error={!!errors.email}
                                        helperText={errors.email}
                                        autoFocus
                                        fullWidth
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><MailOutlineIcon fontSize="small" /></InputAdornment> } }}
                                    />
                                    <TextField
                                        label="Senha"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Sua senha"
                                        value={si.senha}
                                        onChange={(e) => setSi((p) => ({ ...p, senha: e.target.value }))}
                                        error={!!errors.senha}
                                        helperText={errors.senha}
                                        fullWidth
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" tabIndex={-1}>
                                                            {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            },
                                        }}
                                    />
                                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                        <FormControlLabel
                                            control={<Checkbox size="small" checked={si.lembrar} onChange={(e) => setSi((p) => ({ ...p, lembrar: e.target.checked }))} />}
                                            label={<Typography variant="body2">Lembrar de mim</Typography>}
                                        />
                                        <Button size="small" sx={{ fontWeight: 700 }}>Esqueceu a senha?</Button>
                                    </Stack>
                                    <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
                                        {loading ? 'Entrando...' : 'Entrar'}
                                    </Button>
                                </Stack>
                            </Box>
                        </>
                    ) : (
                        <>
                            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
                                Crie sua conta
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 3, fontSize: 14 }}>
                                Comece a organizar seus negócios em minutos.
                            </Typography>
                            <Box component="form" onSubmit={submitSignup}>
                                <Stack spacing={2.5}>
                                    <TextField
                                        label="Nome completo"
                                        placeholder="Seu nome"
                                        value={su.nome}
                                        onChange={(e) => setSu((p) => ({ ...p, nome: e.target.value }))}
                                        error={!!errors.nome}
                                        helperText={errors.nome}
                                        autoFocus
                                        fullWidth
                                    />
                                    <TextField
                                        label="E-mail"
                                        type="email"
                                        placeholder="voce@empresa.com"
                                        value={su.email}
                                        onChange={(e) => setSu((p) => ({ ...p, email: e.target.value }))}
                                        error={!!errors.email}
                                        helperText={errors.email}
                                        fullWidth
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><MailOutlineIcon fontSize="small" /></InputAdornment> } }}
                                    />
                                    <TextField
                                        label="Senha"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Crie uma senha"
                                        value={su.senha}
                                        onChange={(e) => setSu((p) => ({ ...p, senha: e.target.value }))}
                                        error={!!errors.senha}
                                        helperText={errors.senha}
                                        fullWidth
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" tabIndex={-1}>
                                                            {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            },
                                        }}
                                    />
                                    <TextField
                                        label="Confirmar senha"
                                        type={showPasswordConfirm ? 'text' : 'password'}
                                        placeholder="Repita a senha"
                                        value={su.confirmar}
                                        onChange={(e) => setSu((p) => ({ ...p, confirmar: e.target.value }))}
                                        error={!!errors.confirmar}
                                        helperText={errors.confirmar}
                                        fullWidth
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton onClick={() => setShowPasswordConfirm((s) => !s)} edge="end" tabIndex={-1}>
                                                            {showPasswordConfirm ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            },
                                        }}
                                    />
                                    <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
                                        {loading ? 'Criando...' : 'Criar conta'}
                                    </Button>
                                </Stack>
                            </Box>
                        </>
                    )}

                    <Divider sx={{ my: 3 }}>
                        <Typography variant="caption" color="text.secondary">ou continue com</Typography>
                    </Divider>

                    <Stack direction="row" spacing={1.5}>
                        <Button variant="outlined" fullWidth startIcon={<GoogleG />} onClick={handleGoogleLogin}>
                            Google
                        </Button>
                        <Button variant="outlined" fullWidth startIcon={<BusinessOutlinedIcon />}>
                            SSO
                        </Button>
                    </Stack>

                    <Typography align="center" sx={{ mt: 3, fontSize: 13.5, color: 'text.secondary' }}>
                        {mode === 'signin' ? (
                            <>Não tem uma conta?{' '}
                                <Button size="small" sx={{ fontWeight: 800 }} onClick={() => switchMode('signup')}>Criar conta</Button>
                            </>
                        ) : (
                            <>Já tem uma conta?{' '}
                                <Button size="small" sx={{ fontWeight: 800 }} onClick={() => switchMode('signin')}>Entrar</Button>
                            </>
                        )}
                    </Typography>
                </Box>
            </Box>

            <Snackbar open={!!toast} autoHideDuration={2600} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert severity="success" variant="filled">{toast}</Alert>
            </Snackbar>
        </Box>
    );
}
