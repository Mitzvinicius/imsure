'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, GoogleG } from './icons';
import { Field } from './Field';
import { PasswordField } from './PasswordField';
import { createNewUser, signIn } from './actions';
import { createClient } from '@/utils/supabase/client';

type Mode = 'signin' | 'signup';

function validEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function AuthPage() {
    const router = useRouter();
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [mode, setMode] = useState<Mode>('signin');
    const [toast, setToast] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const [si, setSi] = useState({ email: '', senha: '', lembrar: false });
    const [su, setSu] = useState({ nome: '', email: '', senha: '', confirmar: '' });

    useEffect(() => {
        const saved = (localStorage.getItem('imsure-theme') as 'light' | 'dark') || 'light';
        setTheme(saved);
    }, []);
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('imsure-theme', theme);
    }, [theme]);
    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 2600);
            return () => clearTimeout(t);
        }
    }, [toast]);

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
        router.push('/contas/nova');
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
        <div className="auth-page">

            <div className="auth-visual">
                <div className="auth-brand">
                    <span className="cloud"><Icon name="cloud" size={26} strokeWidth={2.2} /></span> imsure
                </div>
                <div className="auth-visual-mid">
                    <h2>O funil de vendas feito para corretoras de seguros.</h2>
                    <p>Gerencie prospecções, negociações e renovações em um só lugar — do primeiro contato ao fechamento.</p>
                </div>
                <div>
                    <div className="auth-stats">
                        <div className="auth-stat"><div className="v">+2.400</div><div className="l">negócios geridos</div></div>
                        <div className="auth-stat"><div className="v">180+</div><div className="l">corretoras ativas</div></div>
                        <div className="auth-stat"><div className="v">98%</div><div className="l">satisfação</div></div>
                    </div>
                    <p className="auth-quote">© 2026 Imsure · Santolin Consultoria</p>
                </div>
            </div>

            <div className="auth-panel">
                <div className="auth-card">
                    <div className="auth-tabs">
                        <button className={mode === 'signin' ? 'active' : ''} onClick={() => switchMode('signin')}>Entrar</button>
                        <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Criar conta</button>
                    </div>

                    {mode === 'signin' ? (
                        <>
                            <div className="auth-head">
                                <h1>Bem-vindo de volta</h1>
                                <p>Entre com sua conta para acessar o funil de vendas.</p>
                            </div>
                            <form className="auth-form" onSubmit={submitSignin}>
                                <Field label="E-mail" icon="mail">
                                    <input
                                        className={'input' + (errors.email ? ' err' : '')}
                                        type="email"
                                        placeholder="voce@empresa.com"
                                        value={si.email}
                                        onChange={(e) => setSi((p) => ({ ...p, email: e.target.value }))}
                                        autoFocus
                                    />
                                </Field>
                                {errors.email && <p className="field-error" style={{ marginTop: -10 }}>{errors.email}</p>}
                                <PasswordField label="Senha" value={si.senha} onChange={(v) => setSi((p) => ({ ...p, senha: v }))} placeholder="Sua senha" error={errors.senha} />
                                <div className="auth-row-between">
                                    <label className="remember" onClick={() => setSi((p) => ({ ...p, lembrar: !p.lembrar }))}>
                                        <span className={'checkbox' + (si.lembrar ? ' on' : '')}>{si.lembrar && <Icon name="check" size={12} strokeWidth={3} />}</span>
                                        Lembrar de mim
                                    </label>
                                    <button type="button" className="link-btn">Esqueceu a senha?</button>
                                </div>
                                <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                                    {loading ? 'Entrando...' : 'Entrar'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="auth-head">
                                <h1>Crie sua conta</h1>
                                <p>Comece a organizar seus negócios em minutos.</p>
                            </div>
                            <form className="auth-form" onSubmit={submitSignup}>
                                <Field label="Nome completo" icon="user">
                                    <input
                                        className={'input' + (errors.nome ? ' err' : '')}
                                        placeholder="Seu nome"
                                        value={su.nome}
                                        onChange={(e) => setSu((p) => ({ ...p, nome: e.target.value }))}
                                        autoFocus
                                    />
                                </Field>
                                {errors.nome && <p className="field-error" style={{ marginTop: -10 }}>{errors.nome}</p>}
                                <Field label="E-mail" icon="mail">
                                    <input
                                        className={'input' + (errors.email ? ' err' : '')}
                                        type="email"
                                        placeholder="voce@empresa.com"
                                        value={su.email}
                                        onChange={(e) => setSu((p) => ({ ...p, email: e.target.value }))}
                                    />
                                </Field>
                                {errors.email && <p className="field-error" style={{ marginTop: -10 }}>{errors.email}</p>}
                                <PasswordField label="Senha" value={su.senha} onChange={(v) => setSu((p) => ({ ...p, senha: v }))} placeholder="Crie uma senha" error={errors.senha} showStrength />
                                <PasswordField label="Confirmar senha" value={su.confirmar} onChange={(v) => setSu((p) => ({ ...p, confirmar: v }))} placeholder="Repita a senha" error={errors.confirmar} />
                                <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                                    {loading ? 'Criando...' : 'Criar conta'}
                                </button>
                            </form>
                        </>
                    )}

                    <div className="auth-divider">ou continue com</div>
                    <div className="auth-sso">
                        <button className="sso-btn" type="button" onClick={handleGoogleLogin}><GoogleG /> Google</button>
                        <button className="sso-btn" type="button"><Icon name="building" size={16} /> SSO</button>
                    </div>

                    <p className="auth-switch">
                        {mode === 'signin' ? (
                            <>Não tem uma conta? <button onClick={() => switchMode('signup')}>Criar conta</button></>
                        ) : (
                            <>Já tem uma conta? <button onClick={() => switchMode('signin')}>Entrar</button></>
                        )}
                    </p>
                </div>
            </div>

            {toast && (
                <div className="auth-toast"><span className="ic"><Icon name="checkCircle" size={18} /></span>{toast}</div>
            )}
        </div>
    );
}
