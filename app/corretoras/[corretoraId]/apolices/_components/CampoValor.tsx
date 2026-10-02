'use client';
import { useState } from "react";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { parseValorBR } from "@/app/lib/seguros/datas";

const formatar = (n: number | null) => (n != null ? String(n).replace(".", ",") : "");

// Guarda o texto digitado (ex.: "100,") e só repassa o número; sem isso a vírgula some a cada tecla.
export default function CampoValor({
    valor,
    onValor,
    ...props
}: { valor: number | null; onValor: (n: number | null) => void } & Omit<TextFieldProps, "value" | "onChange">) {
    const [texto, setTexto] = useState(formatar(valor));
    const [ultimoValor, setUltimoValor] = useState(valor);

    if (valor !== ultimoValor) {
        setUltimoValor(valor);
        if (parseValorBR(texto) !== valor) setTexto(formatar(valor));
    }

    return (
        <TextField
            {...props}
            value={texto}
            onChange={(e) => {
                setTexto(e.target.value);
                onValor(parseValorBR(e.target.value));
            }}
        />
    );
}
