'use client';
import { CampoMoeda, CampoPercentual } from "@/app/ui/design/CamposMascarados";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { criarApolice, atualizarApolice } from "@/app/lib/actions-seguros";
import { tipoBemDoRamo } from "@/app/lib/seguros/ramos";
import { validarApoliceForm } from "@/app/lib/seguros/validacao";
import { LABEL_FORMA_PAGAMENTO, type ApoliceForm as ApoliceFormDados, type ContatoResumo, type FormaPagamento, type Seguradora } from "@/app/lib/seguros/types";
import ContatoPicker from "./ContatoPicker";
import BemSeguradoFields from "./BemSeguradoFields";
import { bemVazioParaRamo } from "@/app/lib/seguros/bem";
import { usePermissoes } from "@/app/ui/design/PermissoesContext";
import CoberturasFields from "./CoberturasFields";
import ParcelasFields from "./ParcelasFields";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{titulo}</Typography>
            {children}
        </Paper>
    );
}

export default function ApoliceForm({
    corretoraId,
    modo,
    apoliceId,
    inicial,
    contatoInicial,
    seguradoras,
    ramos,
    membros,
}: {
    corretoraId: string;
    modo: "criar" | "editar";
    apoliceId?: string;
    inicial: ApoliceFormDados;
    contatoInicial: ContatoResumo | null;
    seguradoras: Seguradora[];
    ramos: string[];
    membros: { id: string; nome: string }[];
}) {
    const router = useRouter();
    const [form, setForm] = useState<ApoliceFormDados>(inicial);
    const [contato, setContato] = useState<ContatoResumo | null>(contatoInicial);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const set = (p: Partial<ApoliceFormDados>) => setForm((f) => ({ ...f, ...p }));

    function trocarRamo(ramo: string) {
        const mesmoTipo = tipoBemDoRamo(ramo) === form.bem.tipo;
        set({ ramo, bem: mesmoTipo ? form.bem : bemVazioParaRamo(ramo) });
    }

    async function salvar() {
        setErro(null);
        const dados = { ...form, contatoId: contato?.id ?? null };
        const erroLocal = validarApoliceForm(modo === "editar" ? { ...dados, parcelas: [] } : dados);
        if (erroLocal) { setErro(erroLocal); return; }

        setSalvando(true);
        if (modo === "criar") {
            const r = await criarApolice({ corretoraId, dados });
            setSalvando(false);
            if (r.error || !r.apoliceId) { setErro(r.error ?? "Erro ao salvar"); return; }
            router.push(`/corretoras/${corretoraId}/apolices/${r.apoliceId}`);
        } else {
            const r = await atualizarApolice({ apoliceId: apoliceId!, dados });
            setSalvando(false);
            if (r.error) { setErro(r.error); return; }
            router.push(`/corretoras/${corretoraId}/apolices/${apoliceId}`);
            router.refresh();
        }
    }

    const { pode } = usePermissoes();
    const seguradoraSelecionada = seguradoras.find((s) => s.id === form.seguradoraId) ?? null;
    const opcoesRamo = form.ramo && !ramos.includes(form.ramo) ? [...ramos, form.ramo] : ramos;

    return (
        <Box sx={{ p: 3, maxWidth: 1100 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 1 }}>Voltar</Button>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>{modo === "criar" ? "Nova apólice" : `Editar apólice ${inicial.numero}`}</Typography>

            <Stack spacing={2}>
                <Secao titulo="Cliente">
                    <ContatoPicker
                        corretoraId={corretoraId}
                        contato={contato}
                        novoContato={form.novoContato}
                        onSelecionar={setContato}
                        onNovoContato={(c) => set({ novoContato: c })}
                    />
                </Secao>

                <Secao titulo="Dados da apólice">
                    <Stack spacing={1.5}>
                        {pode("carteira.transferir") && (
                            <TextField select label="Responsável" value={form.responsavelUsuarioId ?? ""} onChange={(e) => set({ responsavelUsuarioId: e.target.value || null })}>
                                <MenuItem value="">{modo === "criar" ? "Eu (ou o vendedor do negócio)" : "Manter o atual"}</MenuItem>
                                {membros.map((m) => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
                            </TextField>
                        )}
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <Autocomplete
                                options={seguradoras}
                                value={seguradoraSelecionada}
                                getOptionLabel={(s) => s.nome}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                onChange={(_e, s) => set({ seguradoraId: s?.id ?? "" })}
                                renderInput={(p) => <TextField {...p} label="Seguradora" required />}
                                sx={{ flex: 1 }}
                            />
                            <TextField select label="Ramo" required value={form.ramo} onChange={(e) => trocarRamo(e.target.value)} sx={{ flex: 1 }}>
                                {opcoesRamo.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                            </TextField>
                            <TextField label="Número da apólice" required value={form.numero} onChange={(e) => set({ numero: e.target.value })} sx={{ flex: 1 }} />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField label="Início da vigência" type="date" required value={form.inicioVigencia} onChange={(e) => set({ inicioVigencia: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                            <TextField label="Fim da vigência" type="date" required value={form.fimVigencia} onChange={(e) => set({ fimVigencia: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                            <CampoMoeda label="Prêmio total" valor={form.premio} onValor={(premio) => set({ premio })} sx={{ flex: 1 }} />
                            <CampoPercentual label="Comissão" valor={form.percentualComissao} onValor={(percentualComissao) => set({ percentualComissao })} sx={{ flex: 1 }} />
                            <TextField select label="Forma de pagamento" value={form.formaPagamento} onChange={(e) => set({ formaPagamento: e.target.value as FormaPagamento })} sx={{ flex: 1 }}>
                                {(Object.keys(LABEL_FORMA_PAGAMENTO) as FormaPagamento[]).map((f) => <MenuItem key={f} value={f}>{LABEL_FORMA_PAGAMENTO[f]}</MenuItem>)}
                            </TextField>
                        </Stack>
                    </Stack>
                </Secao>

                {form.ramo && (
                    <Secao titulo="Bem segurado">
                        <BemSeguradoFields bem={form.bem} onChange={(bem) => set({ bem })} />
                    </Secao>
                )}

                <Secao titulo="Coberturas">
                    <CoberturasFields coberturas={form.coberturas} onChange={(coberturas) => set({ coberturas })} />
                </Secao>

                {modo === "criar" && (
                    <Secao titulo="Parcelas">
                        <ParcelasFields
                            parcelas={form.parcelas}
                            onChange={(parcelas) => set({ parcelas })}
                            premio={form.premio}
                            percentualComissao={form.percentualComissao}
                            mostrarBoleto={form.formaPagamento === "boleto"}
                        />
                    </Secao>
                )}

                {erro && <Alert severity="error">{erro}</Alert>}
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end" }}>
                    <Button onClick={() => router.back()}>Cancelar</Button>
                    <Button variant="contained" disabled={salvando} onClick={salvar}>{salvando ? "Salvando..." : "Salvar apólice"}</Button>
                </Stack>
            </Stack>
        </Box>
    );
}
