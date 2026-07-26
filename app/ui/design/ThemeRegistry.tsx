'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme } from './theme';

type Mode = 'light' | 'dark';

const ColorModeContext = createContext<{ mode: Mode; toggle: () => void }>({
    mode: 'light',
    toggle: () => {},
});

export function useColorMode() {
    return useContext(ColorModeContext);
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<Mode>('light');

    useEffect(() => {
        const saved = (localStorage.getItem('imsure-theme') as Mode) || 'light';
        setMode(saved);
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    const toggle = () => {
        setMode((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem('imsure-theme', next);
            document.documentElement.setAttribute('data-theme', next);
            return next;
        });
    };

    const theme = useMemo(() => getTheme(mode), [mode]);

    return (
        <AppRouterCacheProvider options={{ key: 'mui' }}>
            <ColorModeContext.Provider value={{ mode, toggle }}>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    {children}
                </ThemeProvider>
            </ColorModeContext.Provider>
        </AppRouterCacheProvider>
    );
}
