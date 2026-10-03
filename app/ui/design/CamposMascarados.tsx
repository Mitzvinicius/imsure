'use client';
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import { formatDecimal, formatMoeda, formatPercentual, mascaraDecimal, mascaraMoeda, mascaraPercentual } from "@/app/corretoras/[corretoraId]/funis/masks";

type Props = { valor: number | null; onValor: (n: number | null) => void } & Omit<TextFieldProps, "value" | "onChange">;

// O texto exibido é sempre derivado do número, então não há estado local para dessincronizar.
export function CampoMoeda({ valor, onValor, permitirNegativo = false, slotProps, ...props }: Props & { permitirNegativo?: boolean }) {
    return (
        <TextField
            {...props}
            value={formatMoeda(valor)}
            onChange={(e) => onValor(mascaraMoeda(e.target.value, permitirNegativo).valor)}
            slotProps={{
                ...slotProps,
                input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> },
                htmlInput: { inputMode: "numeric" },
            }}
        />
    );
}

export function CampoPercentual({ valor, onValor, slotProps, ...props }: Props) {
    return (
        <TextField
            {...props}
            value={formatPercentual(valor)}
            onChange={(e) => onValor(mascaraPercentual(e.target.value).valor)}
            slotProps={{
                ...slotProps,
                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                htmlInput: { inputMode: "numeric" },
            }}
        />
    );
}

export function CampoDecimal({
    valor,
    onValor,
    casas,
    maxDigitos,
    sufixo,
    slotProps,
    ...props
}: Props & { casas: number; maxDigitos: number; sufixo: string }) {
    return (
        <TextField
            {...props}
            value={formatDecimal(valor, casas)}
            onChange={(e) => onValor(mascaraDecimal(e.target.value, casas, maxDigitos).valor)}
            slotProps={{
                ...slotProps,
                input: { endAdornment: <InputAdornment position="end">{sufixo}</InputAdornment> },
                htmlInput: { inputMode: "numeric" },
            }}
        />
    );
}
