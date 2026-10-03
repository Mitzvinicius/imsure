'use client';
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import { LABEL_ESTADO_CIVIL, type EstadoCivil } from "@/app/lib/contatos/parentesco";
import { formatCpfCnpj, formatTelefone, validarEmail } from "../../../funis/masks";
import BarraSalvar, { type EstadoSalvar } from "./BarraSalvar";
import type { ContatoFicha } from "../tipos";

export default function AbaPrincipais({ ficha, set, somenteContato = false, ...salvar }: { ficha: ContatoFicha; set: (p: Partial<ContatoFicha>) => void; somenteContato?: boolean } & EstadoSalvar) {
    const pf = ficha.tipoPessoa === "fisica";
    const emailInvalido = !!ficha.email && !validarEmail(ficha.email);
    return (
        <>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <TextField label="Nome" required disabled={somenteContato} value={ficha.nome} onChange={(e) => set({ nome: e.target.value })} sx={{ gridColumn: "1 / -1" }} />
                <TextField label="Telefone" value={ficha.telefone ?? ""} onChange={(e) => set({ telefone: formatTelefone(e.target.value) || null })} placeholder="(00) 00000-0000" slotProps={{ htmlInput: { inputMode: "numeric" } }} />
                <TextField label="E-mail" type="email" value={ficha.email ?? ""} onChange={(e) => set({ email: e.target.value || null })} error={emailInvalido} helperText={emailInvalido ? "E-mail inválido" : ""} />
                <TextField
                    disabled={somenteContato}
                    label={pf ? "CPF" : "CNPJ"}
                    value={ficha.cpfCnpj ?? ""}
                    onChange={(e) => { const { formatted, tipo } = formatCpfCnpj(e.target.value); set({ cpfCnpj: formatted || null, tipoPessoa: tipo }); }}
                    slotProps={{ htmlInput: { inputMode: "numeric" } }}
                />
                <TextField disabled={somenteContato} label={pf ? "Data de nascimento" : "Data de abertura"} type="date" value={ficha.dataNascimento ?? ""} onChange={(e) => set({ dataNascimento: e.target.value || null })} slotProps={{ inputLabel: { shrink: true } }} />
                {pf && (
                    <TextField select disabled={somenteContato} label="Estado civil" value={ficha.estadoCivil ?? ""} onChange={(e) => set({ estadoCivil: (e.target.value || null) as EstadoCivil | null })}>
                        <MenuItem value="">Não informado</MenuItem>
                        {(Object.keys(LABEL_ESTADO_CIVIL) as EstadoCivil[]).map((k) => <MenuItem key={k} value={k}>{LABEL_ESTADO_CIVIL[k]}</MenuItem>)}
                    </TextField>
                )}
            </Box>
            <BarraSalvar {...salvar} desabilitado={emailInvalido} />
        </>
    );
}
