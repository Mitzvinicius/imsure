'use client';
import { CampoMoeda } from "@/app/ui/design/CamposMascarados";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { atualizarNegocio, atualizarContato, deletarNegocio, marcarNegocioPerdido, reabrirNegocio } from "@/app/lib/actions";
import { MOTIVOS_PERDA } from "@/app/lib/seguros/etapas";
import { usePermissoes } from "@/app/ui/design/PermissoesContext";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Alert from "@mui/material/Alert";
import { Etapa, Negocio } from "./types";
import { TIPOS, SEGURADORAS, ORIGENS, GRUPOS_PRODUCAO } from "./constants";
import { initials, avatarColor } from "@/app/ui/design/avatar";
import { corEtapa } from "./KanbanView";
import ProfissaoEditor from "./ProfissaoEditor";
import DealActivityPanel from "./DealActivityPanel";
import { formatTelefone, formatCpfCnpj, cpfCnpjCompleto, validarEmail } from "./masks";

function dataParaInput(iso: string | null) {
    if (!iso) return "";
    return iso.slice(0, 10);
}

export default function DealDetail({
    negocio,
    etapas,
    ramosAtuacao,
    corretoraNome,
    membros,
    onClose,
    onSaved,
    onDeleted,
}: {
    negocio: Negocio;
    etapas: Etapa[];
    ramosAtuacao: string[];
    corretoraNome: string;
    membros: { id: string; nome: string }[];
    onClose: () => void;
    onSaved: () => void;
    onDeleted: () => void;
}) {
    const router = useRouter();
    const { pode } = usePermissoes();
    const [vendedorId, setVendedorId] = useState(negocio.vendedor.id);
    const { corretoraId } = useParams<{ corretoraId: string }>();
    const [perdaAberta, setPerdaAberta] = useState(false);
    const [motivoPerda, setMotivoPerda] = useState("");
    const [observacaoPerda, setObservacaoPerda] = useState("");
    const [erroStatus, setErroStatus] = useState<string | null>(null);

    async function confirmarPerda() {
        setErroStatus(null);
        const r = await marcarNegocioPerdido({ negocioId: negocio.id, motivo: motivoPerda, observacao: observacaoPerda || null });
        if (r.error) { setErroStatus(r.error); return; }
        setPerdaAberta(false);
        onSaved();
    }

    async function reabrir() {
        setErroStatus(null);
        const r = await reabrirNegocio({ negocioId: negocio.id });
        if (r.error) setErroStatus(r.error); else onSaved();
    }

    const [nome, setNome] = useState(negocio.contato.nome);
    const [email, setEmail] = useState(negocio.contato.email ?? "");
    const [emailTocado, setEmailTocado] = useState(false);
    const [telefone, setTelefone] = useState(negocio.contato.telefone ?? "");
    const [cpfCnpj, setCpfCnpj] = useState(negocio.contato.cpf_cnpj ?? "");
    const [tipoPessoa, setTipoPessoa] = useState<"fisica" | "juridica">(negocio.contato.tipo_pessoa);
    const [profissoes, setProfissoes] = useState<string[]>(negocio.contato.profissoes ?? []);

    const [etapaId, setEtapaId] = useState(negocio.etapa_id);
    const [tipo, setTipo] = useState(negocio.tipo);
    const [ramo, setRamo] = useState(negocio.ramo);
    const [seguradora, setSeguradora] = useState(negocio.seguradora ?? "");
    const [origem, setOrigem] = useState(negocio.origem ?? "");
    const [grupoProducao, setGrupoProducao] = useState(negocio.grupo_producao ?? "");
    const [valor, setValor] = useState<number | null>(negocio.valor);
    const [fechadoEm, setFechadoEm] = useState(dataParaInput(negocio.fechado_em));
    const [indicacao, setIndicacao] = useState(negocio.indicacao);

    const [salvando, setSalvando] = useState(false);
    const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

    const etapaIndex = etapas.findIndex((e) => e.id === etapaId);
    const cor = corEtapa(etapaIndex < 0 ? 0 : etapaIndex);
    const etapaNome = etapas.find((e) => e.id === etapaId)?.nome ?? "—";


    function onTelefoneChange(v: string) {
        setTelefone(formatTelefone(v));
    }

    function onCpfCnpjChange(v: string) {
        const { formatted, tipo: t } = formatCpfCnpj(v);
        setCpfCnpj(formatted);
        setTipoPessoa(t);
    }

    const emailInvalido = emailTocado && email.trim().length > 0 && !validarEmail(email.trim());
    const cpfCnpjIncompleto = cpfCnpj.trim().length > 0 && !cpfCnpjCompleto(cpfCnpj);

    async function salvar() {
        if ((email.trim() && !validarEmail(email.trim())) || cpfCnpjIncompleto) {
            setEmailTocado(true);
            return;
        }
        setSalvando(true);
        const [rContato, rNegocio] = await Promise.all([
            atualizarContato({
                contatoId: negocio.contato.id,
                nome: nome.trim() || negocio.contato.nome,
                email: email || null,
                telefone: telefone || null,
                cpfCnpj: cpfCnpj || null,
                tipoPessoa,
                profissoes,
            }),
            atualizarNegocio({
                negocioId: negocio.id,
                etapaId,
                tipo,
                ramo,
                seguradora: seguradora || null,
                origem: origem || null,
                grupoProducao: grupoProducao || null,
                valor,
                indicacao,
                fechadoEm: fechadoEm || null,
                vendedorUsuarioId: vendedorId !== negocio.vendedor.id ? vendedorId : undefined,
            }),
        ]);
        setSalvando(false);
        if (!rContato.error && !rNegocio.error) onSaved();
    }

    async function excluir() {
        setSalvando(true);
        const res = await deletarNegocio({ negocioId: negocio.id });
        setSalvando(false);
        if (!res.error) onDeleted();
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "100vh", bgcolor: "background.default" }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 3, py: 1.75, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
                <Stack direction="row" spacing={1.75} sx={{ alignItems: "center", minWidth: 0 }}>
                    <Button variant="contained" size="small" startIcon={<ArrowBackIcon fontSize="small" />} onClick={onClose}>
                        Voltar
                    </Button>
                    <Divider orientation="vertical" flexItem />
                    <Avatar sx={{ width: 34, height: 34, bgcolor: avatarColor(nome) }}>{initials(nome)}</Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 800, fontSize: 15.5 }}>{nome || "Sem nome"}</Typography>
                        <Chip size="small" label={etapaNome} sx={{ bgcolor: `${cor}26`, color: cor, fontWeight: 700, height: 20, fontSize: 11 }} />
                    </Box>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {negocio.status === "ganho" && <Chip color="success" label="Ganho" />}
                    {negocio.status === "perdido" && (
                        <Chip color="error" label={negocio.motivo_perda ? `Perdido · ${negocio.motivo_perda}` : "Perdido"} title={negocio.observacao_perda ?? undefined} />
                    )}
                    {negocio.status === "perdido" && <Button size="small" onClick={reabrir}>Reabrir</Button>}
                    {negocio.status === "aberto" && (
                        <Button size="small" color="error" onClick={() => setPerdaAberta(true)}>Marcar como perdido</Button>
                    )}
                    {negocio.apolice_renovada_id && (
                        <Button size="small" onClick={() => router.push(`/corretoras/${corretoraId}/apolices/${negocio.apolice_renovada_id}`)}>
                            Apólice a renovar
                        </Button>
                    )}
                    {negocio.apolice_emitida_id ? (
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DescriptionOutlinedIcon />}
                            onClick={() => router.push(`/corretoras/${corretoraId}/apolices/${negocio.apolice_emitida_id}`)}
                        >
                            Ver apólice
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<DescriptionOutlinedIcon />}
                            onClick={() => router.push(`/corretoras/${corretoraId}/apolices/nova?negocioId=${negocio.id}`)}
                        >
                            Emitir apólice
                        </Button>
                    )}
                </Stack>
            </Stack>

            <Stack spacing={2.5} sx={{ flex: 1, overflowY: "auto", p: 3 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "340px 1fr" }, gap: 2.5, alignItems: "start" }}>
                    <Paper variant="outlined" sx={{ p: 2.75, borderRadius: 3, position: { md: "sticky" }, top: { md: 0 } }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 15, mb: 2.25, pb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                            Informações da pessoa
                        </Typography>
                        <Stack spacing={2}>
                            <TextField label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} fullWidth />
                            <TextField
                                label="E-mail"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={() => setEmailTocado(true)}
                                error={emailInvalido}
                                helperText={emailInvalido ? "Não é um endereço de e-mail válido" : ""}
                                fullWidth
                            />
                            <TextField
                                label="Telefone principal"
                                value={telefone}
                                onChange={(e) => onTelefoneChange(e.target.value)}
                                placeholder="(00) 00000-0000"
                                slotProps={{ htmlInput: { inputMode: "numeric" } }}
                                fullWidth
                            />
                            <TextField
                                label={tipoPessoa === "juridica" ? "CNPJ" : "CPF/CNPJ"}
                                value={cpfCnpj}
                                onChange={(e) => onCpfCnpjChange(e.target.value)}
                                error={cpfCnpjIncompleto}
                                helperText={cpfCnpjIncompleto ? "CPF/CNPJ incompleto" : (tipoPessoa === "juridica" ? "Detectamos um CNPJ (pessoa jurídica)" : "")}
                                placeholder="000.000.000-00"
                                slotProps={{ htmlInput: { inputMode: "numeric" } }}
                                fullWidth
                            />
                            <Box>
                                <Typography variant="caption" sx={{ display: "block", mb: 0.75, fontWeight: 700, color: "text.secondary" }}>
                                    Profissão do cliente
                                </Typography>
                                <ProfissaoEditor values={profissoes} onChange={setProfissoes} />
                            </Box>
                            <FormControlLabel control={<Switch checked={indicacao} onChange={(e) => setIndicacao(e.target.checked)} />} label="Cliente é indicação" />
                        </Stack>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2.75, borderRadius: 3 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 15, mb: 2.25, pb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                            Informações do negócio
                        </Typography>
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                            <TextField select label="Tipo de seguro" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                                {TIPOS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                            </TextField>
                            <TextField select label="Etapa do negócio" value={etapaId} onChange={(e) => setEtapaId(e.target.value)}>
                                {etapas.map((e) => <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>)}
                            </TextField>
                            <TextField select label="Ramo" value={ramo} onChange={(e) => setRamo(e.target.value)}>
                                {ramosAtuacao.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                            </TextField>
                            <TextField select label="Seguradora" value={seguradora} onChange={(e) => setSeguradora(e.target.value)}>
                                <MenuItem value="">—</MenuItem>
                                {SEGURADORAS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </TextField>
                            <CampoMoeda label="Prêmio bruto" valor={valor} onValor={setValor} />
                            <TextField label="Data de fechamento" type="date" value={fechadoEm} onChange={(e) => setFechadoEm(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                            {pode("carteira.transferir") ? (
                                <TextField select label="Vendedor responsável" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                                    {membros.map((m) => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
                                </TextField>
                            ) : (
                                <TextField label="Vendedor responsável" value={negocio.vendedor.nome} disabled />
                            )}
                            <TextField select label="Origem do cliente" value={origem} onChange={(e) => setOrigem(e.target.value)}>
                                <MenuItem value="">—</MenuItem>
                                {ORIGENS.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                            </TextField>
                            <TextField select label="Grupo de produção" value={grupoProducao} onChange={(e) => setGrupoProducao(e.target.value)}>
                                <MenuItem value="">—</MenuItem>
                                {GRUPOS_PRODUCAO.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                            </TextField>
                            <TextField label="Corretora" value={corretoraNome} disabled />
                        </Box>
                    </Paper>
                </Box>

                <DealActivityPanel key={negocio.id} negocioId={negocio.id} />
            </Stack>

            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 3, py: 2, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}>
                {confirmandoExclusao ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Typography variant="body2" color="error">Excluir esse negócio?</Typography>
                        <Button size="small" onClick={() => setConfirmandoExclusao(false)}>Cancelar</Button>
                        <Button size="small" color="error" variant="contained" disabled={salvando} onClick={excluir}>Confirmar</Button>
                    </Stack>
                ) : (
                    pode("negocios.excluir") ? (
                        <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setConfirmandoExclusao(true)}>
                            Deletar negócio
                        </Button>
                    ) : <span />
                )}
                <Stack direction="row" spacing={1.5}>
                    <Button onClick={onClose} color="inherit">Fechar</Button>
                    <Button variant="contained" startIcon={<SaveIcon />} disabled={salvando} onClick={salvar}>
                        {salvando ? "Salvando..." : "Salvar"}
                    </Button>
                </Stack>
            </Stack>
            <Dialog open={perdaAberta} onClose={() => setPerdaAberta(false)} fullWidth maxWidth="xs">
                <DialogTitle>Marcar negócio como perdido</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField select label="Motivo" required value={motivoPerda} onChange={(e) => setMotivoPerda(e.target.value)}>
                            {MOTIVOS_PERDA.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                        </TextField>
                        <TextField label="Observação" multiline minRows={2} value={observacaoPerda} onChange={(e) => setObservacaoPerda(e.target.value)} />
                        {erroStatus && <Alert severity="error">{erroStatus}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPerdaAberta(false)}>Cancelar</Button>
                    <Button variant="contained" color="error" disabled={!motivoPerda} onClick={confirmarPerda}>Marcar como perdido</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
