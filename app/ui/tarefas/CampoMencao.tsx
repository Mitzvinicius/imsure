'use client';
import { useRef, useState } from "react";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import MenuList from "@mui/material/MenuList";
import MenuItem from "@mui/material/MenuItem";
import { consultaMencaoAtiva, inserirMencao } from "@/app/lib/tarefas/regras";
import type { Membro } from "@/app/lib/tarefas/tipos";

export default function CampoMencao({ valor, onValor, membros, placeholder, disabled }: {
    valor: string;
    onValor: (v: string) => void;
    membros: Membro[];
    placeholder?: string;
    disabled?: boolean;
}) {
    const ref = useRef<HTMLTextAreaElement | null>(null);
    const [ancora, setAncora] = useState<HTMLElement | null>(null);
    const [cursor, setCursor] = useState(-1);
    const [destaque, setDestaque] = useState(0);

    const consulta = consultaMencaoAtiva(valor, cursor);
    const termo = consulta?.termo.toLocaleLowerCase("pt-BR") ?? "";
    const sugestoes = consulta ? membros.filter((m) => m.nome.toLocaleLowerCase("pt-BR").includes(termo)).slice(0, 6) : [];
    const indice = Math.min(destaque, Math.max(sugestoes.length - 1, 0));

    function escolher(m: Membro) {
        if (!consulta) return;
        const r = inserirMencao(valor, consulta.inicio, cursor, m.nome);
        onValor(r.texto);
        setCursor(r.cursor);
        requestAnimationFrame(() => {
            ref.current?.focus();
            ref.current?.setSelectionRange(r.cursor, r.cursor);
        });
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (!sugestoes.length) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setDestaque((indice + 1) % sugestoes.length); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setDestaque((indice - 1 + sugestoes.length) % sugestoes.length); }
        else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); escolher(sugestoes[indice]); }
        else if (e.key === "Escape") { e.preventDefault(); setCursor(-1); }
    }

    return (
        <>
            <TextField
                fullWidth
                multiline
                minRows={2}
                value={valor}
                placeholder={placeholder}
                disabled={disabled}
                inputRef={ref}
                ref={(el: HTMLDivElement | null) => setAncora(el)}
                onChange={(e) => {
                    onValor(e.target.value);
                    setCursor((e.target as HTMLTextAreaElement).selectionStart ?? e.target.value.length);
                    setDestaque(0);
                }}
                onKeyDown={onKeyDown}
                onBlur={() => setCursor(-1)}
                slotProps={{ htmlInput: { onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => setCursor(e.currentTarget.selectionStart ?? 0) } }}
                helperText="Use @ para chamar alguém da equipe"
            />
            <Popper open={sugestoes.length > 0 && !!ancora} anchorEl={ancora} placement="bottom-start" sx={{ zIndex: 1500 }}>
                <Paper elevation={4}>
                    <MenuList dense>
                        {sugestoes.map((m, i) => (
                            <MenuItem key={m.id} selected={i === indice} onMouseDown={(e) => { e.preventDefault(); escolher(m); }}>
                                {m.nome}
                            </MenuItem>
                        ))}
                    </MenuList>
                </Paper>
            </Popper>
        </>
    );
}
