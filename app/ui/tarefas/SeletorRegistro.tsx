'use client';
import { useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { buscarRegistros } from "@/app/lib/actions-tarefas";
import { LABEL_TIPO_VINCULO } from "@/app/lib/tarefas/regras";
import type { RegistroBusca } from "@/app/lib/tarefas/tipos";

export default function SeletorRegistro({ corretoraId, valor, onValor }: {
    corretoraId: string;
    valor: RegistroBusca | null;
    onValor: (r: RegistroBusca | null) => void;
}) {
    const [termo, setTermo] = useState("");
    const [opcoes, setOpcoes] = useState<RegistroBusca[]>([]);
    const curto = termo.trim().length < 2;

    useEffect(() => {
        if (termo.trim().length < 2) return;
        let ativo = true;
        const t = setTimeout(async () => {
            const r = await buscarRegistros({ corretoraId, termo });
            if (ativo) setOpcoes(r.registros);
        }, 250);
        return () => { ativo = false; clearTimeout(t); };
    }, [corretoraId, termo]);

    return (
        <Autocomplete
            options={curto ? [] : opcoes}
            value={valor}
            filterOptions={(x) => x}
            getOptionLabel={(o) => o.rotulo}
            groupBy={(o) => LABEL_TIPO_VINCULO[o.tipo]}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_e, v) => onValor(v)}
            onInputChange={(_e, v) => setTermo(v)}
            noOptionsText={curto ? "Digite ao menos 2 letras" : "Nada encontrado"}
            renderInput={(p) => <TextField {...p} label="Vincular a (opcional)" placeholder="Nome do cliente ou nº da apólice" />}
        />
    );
}
