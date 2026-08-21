'use client';
import { useMemo, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import CloseIcon from "@mui/icons-material/Close";
import { buscarContatos, criarNegocio } from "@/app/lib/actions";
import { Etapa, ContatoBusca } from "./types";
import { TIPOS } from "./constants";
import { formatTelefone, formatCpfCnpj, cpfCnpjCompleto, validarEmail } from "./masks";

type Opcao = ContatoBusca | { id: "__novo__"; nome: string; email: null; telefone: null; cpf_cnpj: null; tipo_pessoa: "fisica"; novo: true };

const filtro = createFilterOptions<Opcao>();

export default function NewDealModal({
    open,
    onClose,
    onCreated,
    corretoraId,
    etapas,
    ramosAtuacao,
}: {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
    corretoraId: string;
    etapas: Etapa[];
    ramosAtuacao: string[];
}) {
    const [contatoInput, setContatoInput] = useState("");
    const [opcoesContato, setOpcoesContato] = useState<ContatoBusca[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [contatoSelecionado, setContatoSelecionado] = useState<ContatoBusca | null>(null);
    const [modoNovoContato, setModoNovoContato] = useState(false);
    const [novoNome, setNovoNome] = useState("");
    const [novoEmail, setNovoEmail] = useState("");
    const [emailTocado, setEmailTocado] = useState(false);
    const [novoTelefone, setNovoTelefone] = useState("");
    const [novoCpfCnpj, setNovoCpfCnpj] = useState("");
    const [novoTipoPessoa, setNovoTipoPessoa] = useState<"fisica" | "juridica">("fisica");

    const [tipo, setTipo] = useState("");
    const [etapaId, setEtapaId] = useState(etapas[0]?.id ?? "");
    const [ramo, setRamo] = useState("");
    const [valor, setValor] = useState("");
    const [indicacao, setIndicacao] = useState(false);
    const [erros, setErros] = useState<Record<string, string>>({});
    const [salvando, setSalvando] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    async function onContatoInputChange(value: string) {
        setContatoInput(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (value.trim().length < 2) {
            setOpcoesContato([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setBuscando(true);
            const r = await buscarContatos({ corretoraId, query: value.trim() });
            setBuscando(false);
            setOpcoesContato(r.contatos as ContatoBusca[]);
        }, 300);
    }

    function selecionarOpcao(opcao: Opcao | null) {
        if (!opcao) {
            setContatoSelecionado(null);
            setModoNovoContato(false);
            return;
        }
        if ("novo" in opcao) {
            setModoNovoContato(true);
            setContatoSelecionado(null);
            setNovoNome(opcao.nome);
            setNovoEmail("");
            setEmailTocado(false);
            setNovoTelefone("");
            setNovoCpfCnpj("");
            setNovoTipoPessoa("fisica");
            return;
        }
        setModoNovoContato(false);
        setContatoSelecionado(opcao);
    }

    function reset() {
        setContatoSelecionado(null);
        setModoNovoContato(false);
        setContatoInput("");
        setOpcoesContato([]);
        setNovoNome("");
        setNovoEmail("");
        setEmailTocado(false);
        setNovoTelefone("");
        setNovoCpfCnpj("");
        setNovoTipoPessoa("fisica");
        setTipo("");
        setEtapaId(etapas[0]?.id ?? "");
        setRamo("");
        setValor("");
        setIndicacao(false);
        setErros({});
    }

    function onTelefoneChange(v: string) {
        setNovoTelefone(formatTelefone(v));
    }

    function onCpfCnpjChange(v: string) {
        const { formatted, tipo: t } = formatCpfCnpj(v);
        setNovoCpfCnpj(formatted);
        setNovoTipoPessoa(t);
    }

    function parseValor(s: string) {
        if (!s.trim()) return null;
        const n = parseFloat(s.replace(/[^\d,]/g, "").replace(",", "."));
        return isNaN(n) ? null : n;
    }

    const emailInvalido = emailTocado && novoEmail.trim().length > 0 && !validarEmail(novoEmail.trim());
    const cpfCnpjIncompleto = novoCpfCnpj.trim().length > 0 && !cpfCnpjCompleto(novoCpfCnpj);

    async function submit() {
        const novosErros: Record<string, string> = {};

        if (!contatoSelecionado && !modoNovoContato) novosErros.contato = "Selecione um contato ou crie um novo";
        if (modoNovoContato) {
            if (!novoNome.trim()) novosErros.novoNome = "Informe o nome";
            if (!novoEmail.trim() && !novoTelefone.trim()) {
                novosErros.novoEmail = "Informe e-mail ou telefone";
                novosErros.novoTelefone = "Informe e-mail ou telefone";
            }
            if (novoEmail.trim() && !validarEmail(novoEmail.trim())) {
                novosErros.novoEmail = "Não é um endereço de e-mail válido";
            }
            if (novoCpfCnpj.trim() && !cpfCnpjCompleto(novoCpfCnpj)) {
                novosErros.novoCpfCnpj = "CPF/CNPJ incompleto";
            }
        }
        if (!tipo) novosErros.tipo = "Escolha o tipo";
        if (!etapaId) novosErros.etapa = "Escolha a etapa";
        if (!ramo) novosErros.ramo = "Escolha o ramo";
        setErros(novosErros);
        if (Object.keys(novosErros).length > 0) return;

        setSalvando(true);
        const r = await criarNegocio({
            corretoraId,
            etapaId,
            contatoId: contatoSelecionado?.id ?? null,
            novoContato: modoNovoContato
                ? {
                    nome: novoNome.trim(),
                    email: novoEmail.trim() || null,
                    telefone: novoTelefone.trim() || null,
                    cpfCnpj: novoCpfCnpj.trim() || null,
                    tipoPessoa: novoTipoPessoa,
                }
                : null,
            tipo,
            ramo,
            valor: parseValor(valor),
            indicacao,
        });
        setSalvando(false);

        if (r.error) {
            setErros({ geral: r.error });
            return;
        }
        reset();
        onCreated();
    }

    const ramoOpcoes = useMemo(() => (ramosAtuacao.length ? ramosAtuacao : ["Automóvel", "Vida Individual", "Residencial", "Resp. Civil Profissional", "Empresarial", "Saúde"]), [ramosAtuacao]);

    const opcoesComCriar: Opcao[] = opcoesContato;

    return (
        <Dialog open={open} onClose={() => { reset(); onClose(); }} fullWidth maxWidth="md">
            <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                Novo negócio
                <IconButton onClick={() => { reset(); onClose(); }} size="small"><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3, mt: 1 }}>
                    <Stack spacing={2.25}>
                        <Typography variant="overline" color="text.secondary">Cliente</Typography>
                        <Autocomplete
                            options={opcoesComCriar}
                            filterOptions={(options, params) => {
                                const filtrados = filtro(options, params);
                                const jaExiste = options.some((o) => "nome" in o && o.nome.toLowerCase() === params.inputValue.toLowerCase());
                                if (params.inputValue.trim().length >= 2 && !jaExiste) {
                                    filtrados.push({ id: "__novo__", nome: params.inputValue, email: null, telefone: null, cpf_cnpj: null, tipo_pessoa: "fisica", novo: true });
                                }
                                return filtrados;
                            }}
                            getOptionLabel={(o) => o.nome}
                            renderOption={(props, option) => (
                                <li {...props} key={option.id}>
                                    {"novo" in option ? `+ Criar novo contato "${option.nome}"` : option.nome}
                                </li>
                            )}
                            loading={buscando}
                            value={contatoSelecionado}
                            onChange={(_, v) => selecionarOpcao(v)}
                            inputValue={contatoInput}
                            onInputChange={(_, v) => onContatoInputChange(v)}
                            noOptionsText={contatoInput.trim().length < 2 ? "Digite para buscar" : "Nenhum contato encontrado"}
                            renderInput={(params) => (
                                <TextField {...params} label="Contato" placeholder="Busque pelo nome" error={!!erros.contato} helperText={erros.contato} autoFocus />
                            )}
                        />

                        {modoNovoContato && (
                            <>
                                <Divider>Novo contato</Divider>
                                <TextField label="Nome completo" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} error={!!erros.novoNome} helperText={erros.novoNome} />
                                <TextField
                                    label="E-mail"
                                    value={novoEmail}
                                    onChange={(e) => setNovoEmail(e.target.value)}
                                    onBlur={() => setEmailTocado(true)}
                                    error={!!erros.novoEmail || emailInvalido}
                                    helperText={erros.novoEmail || (emailInvalido ? "Não é um endereço de e-mail válido" : "")}
                                />
                                <TextField
                                    label="Telefone"
                                    value={novoTelefone}
                                    onChange={(e) => onTelefoneChange(e.target.value)}
                                    error={!!erros.novoTelefone}
                                    helperText={erros.novoTelefone}
                                    placeholder="(00) 00000-0000"
                                    slotProps={{ htmlInput: { inputMode: "numeric" } }}
                                />
                                <TextField
                                    label={novoTipoPessoa === "juridica" ? "CNPJ (opcional)" : "CPF/CNPJ (opcional)"}
                                    value={novoCpfCnpj}
                                    onChange={(e) => onCpfCnpjChange(e.target.value)}
                                    error={!!erros.novoCpfCnpj || cpfCnpjIncompleto}
                                    helperText={erros.novoCpfCnpj || (cpfCnpjIncompleto ? "CPF/CNPJ incompleto" : (novoTipoPessoa === "juridica" ? "Detectamos um CNPJ (pessoa jurídica)" : ""))}
                                    placeholder="000.000.000-00"
                                    slotProps={{ htmlInput: { inputMode: "numeric" } }}
                                />
                            </>
                        )}

                        {contatoSelecionado && (
                            <>
                                <Divider>Dados cadastrados</Divider>
                                <TextField label="E-mail" value={contatoSelecionado.email ?? "—"} disabled />
                                <TextField label="Telefone" value={contatoSelecionado.telefone ?? "—"} disabled />
                                <TextField label={contatoSelecionado.tipo_pessoa === "juridica" ? "CNPJ" : "CPF"} value={contatoSelecionado.cpf_cnpj ?? "—"} disabled />
                            </>
                        )}
                    </Stack>

                    <Stack spacing={2.25}>
                        <Typography variant="overline" color="text.secondary">Negócio</Typography>
                        <TextField select label="Tipo de negócio" value={tipo} onChange={(e) => setTipo(e.target.value)} error={!!erros.tipo} helperText={erros.tipo}>
                            {TIPOS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </TextField>
                        <TextField select label="Etapa" value={etapaId} onChange={(e) => setEtapaId(e.target.value)} error={!!erros.etapa} helperText={erros.etapa}>
                            {etapas.map((e) => <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>)}
                        </TextField>
                        <TextField select label="Ramo" value={ramo} onChange={(e) => setRamo(e.target.value)} error={!!erros.ramo} helperText={erros.ramo}>
                            {ramoOpcoes.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </TextField>
                        <TextField label="Valor potencial (opcional)" placeholder="Ex: 1.500,00" value={valor} onChange={(e) => setValor(e.target.value)} />
                        <FormControlLabel control={<Switch checked={indicacao} onChange={(e) => setIndicacao(e.target.checked)} />} label="Cliente é indicação" />
                    </Stack>
                </Box>
                {erros.geral && <Typography color="error" variant="body2" sx={{ mt: 2 }}>{erros.geral}</Typography>}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={() => { reset(); onClose(); }} color="inherit">Cancelar</Button>
                <Button variant="contained" disabled={salvando} onClick={submit}>
                    {salvando ? "Criando..." : "Criar negócio"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
