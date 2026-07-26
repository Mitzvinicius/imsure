import { createTheme, type ThemeOptions } from '@mui/material/styles';

const shared: ThemeOptions = {
    typography: {
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        button: { textTransform: 'none', fontWeight: 700 },
    },
    shape: { borderRadius: 10 },
    components: {
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: 10 },
            },
        },
        MuiTextField: {
            defaultProps: { size: 'small' },
        },
        MuiPaper: {
            styleOverrides: {
                root: { backgroundImage: 'none' },
            },
        },
    },
};

export function getTheme(mode: 'light' | 'dark') {
    return createTheme({
        ...shared,
        palette: {
            mode,
            primary: { main: mode === 'dark' ? '#3a52a0' : '#21305c' },
            secondary: { main: mode === 'dark' ? '#f6c33f' : '#f3b427' },
            error: { main: mode === 'dark' ? '#f87171' : '#dc2626' },
            success: { main: mode === 'dark' ? '#34d399' : '#15935a' },
            warning: { main: mode === 'dark' ? '#fbbf24' : '#d97706' },
            background: {
                default: mode === 'dark' ? '#0b1120' : '#e9ecf1',
                paper: mode === 'dark' ? '#151d33' : '#ffffff',
            },
            text: {
                primary: mode === 'dark' ? '#e7ecf6' : '#18203a',
                secondary: mode === 'dark' ? '#9aa4ba' : '#65708a',
            },
            divider: mode === 'dark' ? 'rgba(255,255,255,.08)' : '#e4e7ee',
        },
    });
}
