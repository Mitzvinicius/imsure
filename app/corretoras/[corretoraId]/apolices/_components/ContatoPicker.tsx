'use client';
import { useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { buscarContatos } from "@/app/lib/actions";
import { formatCpfCnpj, formatTelefone } from "../../funis/masks";
import type { ContatoResumo, NovoContato } from "@/app/lib/seguros/types";

export default function ContatoPicker({
    corretoraId,
    contato,
    novoContato,
    onSelecionar,
    onNovoContato,
}: {
    corretoraId: string;
    contato: ContatoResumo | null;
    novoContato: NovoContato | null;
    onSelecionar: (c: ContatoResumo | null) => void;
    onNovoContato: (c: NovoContato | null) => void;
}) {
    const [termo, setTermo] = useState("");
    const [opcoes, setOpcoes] = useState<ContatoResumo[]>([]);

    useEffect(() => {
        if (termo.trim().length < 2) return;
        const t = setTimeout(async () => {
            const r = await buscarContatos({ corretoraId, query: termo.trim() });
            setOpcoes((r.contatos ?? []).map((c) => ({ id: c.id, nome: c.nome, cpf_cnpj: c.cpf_cnpj })));
        }, 250);
        return () => clearTimeout(t);
    }, [termo, corretoraId]);

    if (novoContato) {
        const digitos = (novoContato.cpfCnpj ?? "").replace(/\D/g, "");
        return (
            <Stack spacing={1.5}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField label="Nome do cliente" required value={novoContato.nome} onChange={(e) => onNovoContato({ ...novoContato, nome: e.target.value })} sx={{ flex: 2 }} />
                    <TextField
                        label="CPF/CNPJ"
                        value={novoContato.cpfCnpj ?? ""}
                        onChange={(e) => {
                            const { formatted, tipo } = formatCpfCnpj(e.target.value);
                            onNovoContato({ ...novoContato, cpfCnpj: formatted || null, tipoPessoa: tipo });
                        }}
                        helperText={digitos ? (digitos.length > 11 ? "Pessoa jurídica" : "Pessoa física") : " "}
                        sx={{ flex: 1 }}
                    />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField label="E-mail" value={novoContato.email ?? ""} onChange={(e) => onNovoContato({ ...novoContato, email: e.target.value || null })} sx={{ flex: 1 }} />
                    <TextField label="Telefone" value={novoContato.telefone ?? ""} onChange={(e) => onNovoContato({ ...novoContato, telefone: formatTelefone(e.target.value) || null })} sx={{ flex: 1 }} />
                </Stack>
                <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => onNovoContato(null)}>Buscar contato existente</Button>
            </Stack>
        );
    }

    return (
        <Stack spacing={1}>
            <Autocomplete
                options={opcoes}
                value={contato}
                getOptionLabel={(o) => (o.cpf_cnpj ? `${o.nome} · ${formatCpfCnpj(o.cpf_cnpj).formatted}` : o.nome)}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                filterOptions={(x) => x}
                onInputChange={(_e, v) => setTermo(v)}
                onChange={(_e, v) => onSelecionar(v)}
                noOptionsText={termo.trim().length < 2 ? "Digite ao menos 2 letras" : "Nenhum contato encontrado"}
                renderInput={(p) => <TextField {...p} label="Cliente" required />}
            />
            <Button
                size="small"
                sx={{ alignSelf: "flex-start" }}
                onClick={() => { onSelecionar(null); onNovoContato({ nome: termo, email: null, telefone: null, cpfCnpj: null, tipoPessoa: "fisica" }); }}
            >
                Cadastrar novo cliente
            </Button>
        </Stack>
    );
}
