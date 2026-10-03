'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Autocomplete from "@mui/material/Autocomplete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { CampoMoeda } from "@/app/ui/design/CamposMascarados";
import { buscarContatos } from "@/app/lib/actions";
import { adicionarVinculo, atualizarFichaContato, removerVinculo } from "@/app/lib/actions-contatos";
import {
    LABEL_ESTADO_CIVIL, LABEL_PARENTESCO, PARENTESCOS, validarNovoParente,
    type EstadoCivil, type Parentesco, type ParenteDoContato,
} from "@/app/lib/contatos/parentesco";
import { formatCpfCnpj, formatTelefone, validarEmail } from "../../funis/masks";
import { initials, avatarColor } from "@/app/ui/design/avatar";
import Avatar from "@mui/material/Avatar";

export type ContatoFicha = {
    id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    cpfCnpj: string | null;
    tipoPessoa: "fisica" | "juridica";
    dataNascimento: string | null;
    estadoCivil: EstadoCivil | null;
    rendaMensal: number | null;
    patrimonioImobilizado: number | null;
    patrimonioFinanceiro: number | null;
};

type Opcao = { id: string; nome: string; telefone: string | null; email: string | null };

function Secao({ titulo, children, acao }: { titulo: string; children: React.ReactNode; acao?: React.ReactNode }) {
    return (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{titulo}</Typography>
                {acao}
            </Stack>
            {children}
        </Paper>
    );
}

export default function ContatoDetail({ corretoraId, contato, parentes }: { corretoraId: string; contato: ContatoFicha; parentes: ParenteDoContato[] }) {
    const router = useRouter();
    const [ficha, setFicha] = useState<ContatoFicha>(contato);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [salvo, setSalvo] = useState(false);
    const set = (p: Partial<ContatoFicha>) => { setFicha((f) => ({ ...f, ...p })); setSalvo(false); };
    const pf = ficha.tipoPessoa === "fisica";
    const emailInvalido = !!ficha.email && !validarEmail(ficha.email);

    async function salvar() {
        setErro(null);
        setSalvando(true);
        try {
            const r = await atualizarFichaContato({ contatoId: contato.id, dados: ficha });
            if (r.error) { setErro(r.error); return; }
            setSalvo(true);
            router.refresh();
        } finally {
            setSalvando(false);
        }
    }

    // ---- parentes
    const [dialogo, setDialogo] = useState(false);
    const [parentesco, setParentesco] = useState<Parentesco | "">("");
    const [modo, setModo] = useState<"existente" | "novo">("existente");
    const [escolhido, setEscolhido] = useState<Opcao | null>(null);
    const [termo, setTermo] = useState("");
    const [opcoes, setOpcoes] = useState<Opcao[]>([]);
    const [novo, setNovo] = useState({ nome: "", telefone: "", email: "" });
    const [erroVinculo, setErroVinculo] = useState<string | null>(null);
    const jaVinculados = new Set([contato.id, ...parentes.map((p) => p.pessoa.id)]);

    useEffect(() => {
        if (termo.trim().length < 2) return;
        const t = setTimeout(async () => {
            const r = await buscarContatos({ corretoraId, query: termo.trim() });
            setOpcoes((r.contatos ?? []).map((c) => ({ id: c.id, nome: c.nome, telefone: c.telefone, email: c.email })));
        }, 250);
        return () => clearTimeout(t);
    }, [termo, corretoraId]);

    function abrirDialogo() {
        setParentesco(""); setModo("existente"); setEscolhido(null); setTermo(""); setOpcoes([]);
        setNovo({ nome: "", telefone: "", email: "" }); setErroVinculo(null); setDialogo(true);
    }

    async function salvarVinculo() {
        setErroVinculo(null);
        if (!parentesco) { setErroVinculo("Escolha o grau de parentesco."); return; }
        if (modo === "existente" && !escolhido) { setErroVinculo("Escolha um contato."); return; }
        if (modo === "novo") {
            const e = validarNovoParente(novo);
            if (e) { setErroVinculo(e); return; }
        }
        const r = await adicionarVinculo({
            corretoraId,
            contatoId: contato.id,
            parentesco,
            parenteId: modo === "existente" ? escolhido!.id : null,
            novoParente: modo === "novo" ? novo : null,
        });
        if (r.error) { setErroVinculo(r.error); return; }
        setDialogo(false);
        router.refresh();
    }

    async function remover(vinculoId: string) {
        const r = await removerVinculo({ vinculoId });
        if (r.error) setErro(r.error); else router.refresh();
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1000 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(`/corretoras/${corretoraId}/contatos`)} sx={{ mb: 1 }}>Contatos</Button>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2.5 }}>
                <Avatar sx={{ bgcolor: avatarColor(ficha.nome) }}>{initials(ficha.nome)}</Avatar>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{ficha.nome || "Sem nome"}</Typography>
                <Chip size="small" label={pf ? "Pessoa física" : "Pessoa jurídica"} />
            </Stack>

            <Stack spacing={2}>
                <Secao titulo="Informações principais">
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                        <TextField label="Nome" required value={ficha.nome} onChange={(e) => set({ nome: e.target.value })} sx={{ gridColumn: "1 / -1" }} />
                        <TextField label="Telefone" value={ficha.telefone ?? ""} onChange={(e) => set({ telefone: formatTelefone(e.target.value) || null })} placeholder="(00) 00000-0000" slotProps={{ htmlInput: { inputMode: "numeric" } }} />
                        <TextField label="E-mail" type="email" value={ficha.email ?? ""} onChange={(e) => set({ email: e.target.value || null })} error={emailInvalido} helperText={emailInvalido ? "E-mail inválido" : ""} />
                        <TextField
                            label={pf ? "CPF" : "CNPJ"}
                            value={ficha.cpfCnpj ?? ""}
                            onChange={(e) => { const { formatted, tipo } = formatCpfCnpj(e.target.value); set({ cpfCnpj: formatted || null, tipoPessoa: tipo }); }}
                            slotProps={{ htmlInput: { inputMode: "numeric" } }}
                        />
                        <TextField label={pf ? "Data de nascimento" : "Data de abertura"} type="date" value={ficha.dataNascimento ?? ""} onChange={(e) => set({ dataNascimento: e.target.value || null })} slotProps={{ inputLabel: { shrink: true } }} />
                        {pf && (
                            <TextField select label="Estado civil" value={ficha.estadoCivil ?? ""} onChange={(e) => set({ estadoCivil: (e.target.value || null) as EstadoCivil | null })}>
                                <MenuItem value="">Não informado</MenuItem>
                                {(Object.keys(LABEL_ESTADO_CIVIL) as EstadoCivil[]).map((k) => <MenuItem key={k} value={k}>{LABEL_ESTADO_CIVIL[k]}</MenuItem>)}
                            </TextField>
                        )}
                    </Box>
                </Secao>

                {pf && (
                    <Secao titulo="Informações financeiras">
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 2 }}>
                            <CampoMoeda label="Renda mensal" valor={ficha.rendaMensal} onValor={(v) => set({ rendaMensal: v })} />
                            <CampoMoeda label="Patrimônio imobilizado" valor={ficha.patrimonioImobilizado} onValor={(v) => set({ patrimonioImobilizado: v })} helperText="Imóveis, veículos e outros bens" />
                            <CampoMoeda label="Patrimônio financeiro" valor={ficha.patrimonioFinanceiro} onValor={(v) => set({ patrimonioFinanceiro: v })} helperText="Investimentos e aplicações" />
                        </Box>
                    </Secao>
                )}

                {erro && <Alert severity="error">{erro}</Alert>}
                {salvo && <Alert severity="success">Contato salvo.</Alert>}
                <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                    <Button variant="contained" startIcon={<SaveIcon />} disabled={salvando || emailInvalido} onClick={salvar}>{salvando ? "Salvando..." : "Salvar"}</Button>
                </Stack>

                {pf && (
                    <Secao titulo="Informações familiares" acao={<Button size="small" startIcon={<AddIcon />} onClick={abrirDialogo}>Adicionar parente</Button>}>
                        {!parentes.length && <Typography color="text.secondary">Nenhum parente cadastrado.</Typography>}
                        <Stack spacing={1}>
                            {parentes.map((p) => (
                                <Stack key={p.vinculoId} direction="row" spacing={1.5} sx={{ alignItems: "center", py: 0.5 }}>
                                    <Chip size="small" label={LABEL_PARENTESCO[p.parentesco]} sx={{ minWidth: 110 }} />
                                    <Link component={NextLink} href={`/corretoras/${corretoraId}/contatos/${p.pessoa.id}`} sx={{ fontWeight: 700 }}>{p.pessoa.nome}</Link>
                                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{[p.pessoa.telefone, p.pessoa.email].filter(Boolean).join(" · ")}</Typography>
                                    <IconButton size="small" aria-label="Remover vínculo" onClick={() => remover(p.vinculoId)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                                </Stack>
                            ))}
                        </Stack>
                    </Secao>
                )}
            </Stack>

            <Dialog open={dialogo} onClose={() => setDialogo(false)} fullWidth maxWidth="sm">
                <DialogTitle>Adicionar parente de {ficha.nome}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField select label="Grau de parentesco" required value={parentesco} onChange={(e) => setParentesco(e.target.value as Parentesco)}
                            helperText={parentesco ? `${LABEL_PARENTESCO[parentesco]} de ${ficha.nome}` : " "}>
                            {PARENTESCOS.map((p) => <MenuItem key={p} value={p}>{LABEL_PARENTESCO[p]}</MenuItem>)}
                        </TextField>
                        <ToggleButtonGroup size="small" exclusive value={modo} onChange={(_e, v) => v && setModo(v)}>
                            <ToggleButton value="existente">Contato existente</ToggleButton>
                            <ToggleButton value="novo">Cadastrar novo</ToggleButton>
                        </ToggleButtonGroup>
                        {modo === "existente" ? (
                            <Autocomplete
                                options={opcoes.filter((o) => !jaVinculados.has(o.id))}
                                value={escolhido}
                                getOptionLabel={(o) => o.nome}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                filterOptions={(x) => x}
                                onInputChange={(_e, v) => setTermo(v)}
                                onChange={(_e, v) => setEscolhido(v)}
                                noOptionsText={termo.trim().length < 2 ? "Digite ao menos 2 letras" : "Nenhum contato encontrado"}
                                renderInput={(p) => <TextField {...p} label="Buscar contato" />}
                            />
                        ) : (
                            <Stack spacing={1.5}>
                                <TextField label="Nome" required value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
                                <TextField label="Telefone" value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: formatTelefone(e.target.value) })} slotProps={{ htmlInput: { inputMode: "numeric" } }} />
                                <TextField label="E-mail" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} helperText="Informe telefone ou e-mail" />
                            </Stack>
                        )}
                        {erroVinculo && <Alert severity="error">{erroVinculo}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogo(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={salvarVinculo}>Adicionar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
