'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import LinkIcon from "@mui/icons-material/Link";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { CampoMoeda } from "@/app/ui/design/CamposMascarados";
import { desvincularBemApolice, removerBemPatrimonio, salvarBemPatrimonio, vincularBemApolice, type BemPatrimonioForm } from "@/app/lib/actions-contatos";
import { LABEL_TIPO_BEM, situacaoSeguroBem, totalPatrimonio, type TipoBemPatrimonio } from "@/app/lib/contatos/patrimonio";
import { COR_STATUS_APOLICE, LABEL_STATUS_APOLICE } from "@/app/lib/seguros/status";
import { formatBRL } from "../../../funis/constants";
import BarraSalvar, { type EstadoSalvar } from "./BarraSalvar";
import type { ApoliceResumo, BemComApolices, ContatoFicha } from "../tipos";

const ICONE: Record<TipoBemPatrimonio, React.ReactNode> = {
    imovel: <HomeOutlinedIcon />,
    veiculo: <DirectionsCarOutlinedIcon />,
    outro: <Inventory2OutlinedIcon />,
};

const SITUACAO = {
    segurado: { label: "Segurado", cor: "success" },
    seguro_vencido: { label: "Seguro vencido", cor: "warning" },
    sem_seguro: { label: "Sem seguro", cor: "error" },
} as const;

const BEM_VAZIO: BemPatrimonioForm = { tipo: "imovel", descricao: "", valorEstimado: null, placa: null, endereco: null };

export default function AbaFinanceiro({
    corretoraId,
    ficha,
    set,
    bens,
    apolicesVinculaveis,
    ...salvar
}: {
    corretoraId: string;
    ficha: ContatoFicha;
    set: (p: Partial<ContatoFicha>) => void;
    bens: BemComApolices[];
    apolicesVinculaveis: ApoliceResumo[];
} & EstadoSalvar) {
    const router = useRouter();
    const [editando, setEditando] = useState<{ id: string | null; dados: BemPatrimonioForm } | null>(null);
    const [erroBem, setErroBem] = useState<string | null>(null);
    const [erroLista, setErroLista] = useState<string | null>(null);
    const [menuVincular, setMenuVincular] = useState<{ anchor: HTMLElement; bem: BemComApolices } | null>(null);
    const total = totalPatrimonio(bens);

    async function salvarBem() {
        if (!editando) return;
        setErroBem(null);
        const r = await salvarBemPatrimonio({ corretoraId, contatoId: ficha.id, bemId: editando.id, dados: editando.dados });
        if (r.error) { setErroBem(r.error); return; }
        setEditando(null);
        router.refresh();
    }

    async function acao(promessa: Promise<{ error: string | null }>) {
        setErroLista(null);
        const r = await promessa;
        if (r.error) setErroLista(r.error); else router.refresh();
    }

    const naoVinculadas = (bem: BemComApolices) => apolicesVinculaveis.filter((a) => !bem.apolices.some((v) => v.id === a.id));

    return (
        <>
            <Typography sx={{ fontWeight: 800, mb: 2 }}>Renda e investimentos</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <CampoMoeda label="Renda mensal" valor={ficha.rendaMensal} onValor={(v) => set({ rendaMensal: v })} />
                <CampoMoeda label="Patrimônio financeiro" valor={ficha.patrimonioFinanceiro} onValor={(v) => set({ patrimonioFinanceiro: v })} helperText="Investimentos e aplicações" />
            </Box>
            <BarraSalvar {...salvar} />

            <Divider sx={{ my: 3 }} />

            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box>
                    <Typography sx={{ fontWeight: 800 }}>Patrimônio imobilizado</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {bens.length ? `${bens.length} ${bens.length === 1 ? "bem" : "bens"} · ${formatBRL(total)}` : "Imóveis, veículos e outros bens do cliente"}
                    </Typography>
                </Box>
                <Button startIcon={<AddIcon />} variant="outlined" onClick={() => { setErroBem(null); setEditando({ id: null, dados: BEM_VAZIO }); }}>Adicionar bem</Button>
            </Stack>

            {erroLista && <Alert severity="error" sx={{ mb: 2 }}>{erroLista}</Alert>}
            {!bens.length && (
                <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderStyle: "dashed", color: "text.secondary" }}>
                    Nenhum bem cadastrado.
                </Paper>
            )}

            <Stack spacing={1.5}>
                {bens.map((bem) => {
                    const situacao = SITUACAO[situacaoSeguroBem(bem.apolices.map((a) => a.status))];
                    return (
                        <Paper key={bem.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
                                <Box sx={{ color: "primary.main", bgcolor: "action.hover", borderRadius: 2, p: 1, display: "flex" }}>{ICONE[bem.tipo]}</Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
                                        <Typography sx={{ fontWeight: 700 }}>{bem.descricao}</Typography>
                                        <Chip size="small" variant="outlined" label={LABEL_TIPO_BEM[bem.tipo]} />
                                        <Chip size="small" color={situacao.cor} label={situacao.label} />
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                        {[bem.placa && `Placa ${bem.placa}`, bem.endereco, bem.valor_estimado != null && formatBRL(bem.valor_estimado)].filter(Boolean).join(" · ") || "Sem detalhes"}
                                    </Typography>
                                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", rowGap: 1 }}>
                                        {bem.apolices.map((a) => (
                                            <Chip
                                                key={a.id}
                                                size="small"
                                                color={COR_STATUS_APOLICE[a.status]}
                                                variant="outlined"
                                                label={`Apólice ${a.numero} · ${a.seguradora} · ${LABEL_STATUS_APOLICE[a.status]}`}
                                                component={NextLink}
                                                href={`/corretoras/${corretoraId}/apolices/${a.id}`}
                                                clickable
                                                onDelete={(e: React.MouseEvent) => { e.preventDefault(); acao(desvincularBemApolice({ bemId: bem.id, apoliceId: a.id })); }}
                                            />
                                        ))}
                                        <Button size="small" startIcon={<LinkIcon />} onClick={(e) => setMenuVincular({ anchor: e.currentTarget, bem })}>
                                            Vincular apólice
                                        </Button>
                                    </Stack>
                                </Box>
                                <IconButton size="small" aria-label="Editar bem" onClick={() => {
                                    setErroBem(null);
                                    setEditando({ id: bem.id, dados: { tipo: bem.tipo, descricao: bem.descricao, valorEstimado: bem.valor_estimado, placa: bem.placa, endereco: bem.endereco } });
                                }}>
                                    <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" aria-label="Remover bem" onClick={() => acao(removerBemPatrimonio({ bemId: bem.id }))}>
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        </Paper>
                    );
                })}
            </Stack>

            <Menu anchorEl={menuVincular?.anchor} open={!!menuVincular} onClose={() => setMenuVincular(null)}>
                {menuVincular && !naoVinculadas(menuVincular.bem).length && (
                    <MenuItem disabled>Nenhuma apólice de automóvel, residencial ou empresarial disponível</MenuItem>
                )}
                {menuVincular && naoVinculadas(menuVincular.bem).map((a) => (
                    <MenuItem key={a.id} onClick={() => { const bem = menuVincular.bem; setMenuVincular(null); acao(vincularBemApolice({ bemId: bem.id, apoliceId: a.id })); }}>
                        {a.numero} · {a.ramo} · {a.seguradora} · {LABEL_STATUS_APOLICE[a.status]}
                    </MenuItem>
                ))}
            </Menu>

            <Dialog open={!!editando} onClose={() => setEditando(null)} fullWidth maxWidth="sm">
                <DialogTitle>{editando?.id ? "Editar bem" : "Adicionar bem"}</DialogTitle>
                {editando && (
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField select label="Tipo" value={editando.dados.tipo} onChange={(e) => setEditando({ ...editando, dados: { ...editando.dados, tipo: e.target.value as TipoBemPatrimonio } })}>
                                {(Object.keys(LABEL_TIPO_BEM) as TipoBemPatrimonio[]).map((t) => <MenuItem key={t} value={t}>{LABEL_TIPO_BEM[t]}</MenuItem>)}
                            </TextField>
                            <TextField
                                label="Descrição"
                                required
                                placeholder={editando.dados.tipo === "veiculo" ? "Ex.: Honda Civic 2022" : editando.dados.tipo === "imovel" ? "Ex.: Casa onde mora" : "Ex.: Equipamentos do consultório"}
                                value={editando.dados.descricao}
                                onChange={(e) => setEditando({ ...editando, dados: { ...editando.dados, descricao: e.target.value } })}
                            />
                            {editando.dados.tipo === "veiculo" && (
                                <TextField label="Placa" value={editando.dados.placa ?? ""} onChange={(e) => setEditando({ ...editando, dados: { ...editando.dados, placa: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7) || null } })} />
                            )}
                            {editando.dados.tipo === "imovel" && (
                                <TextField label="Endereço" value={editando.dados.endereco ?? ""} onChange={(e) => setEditando({ ...editando, dados: { ...editando.dados, endereco: e.target.value || null } })} />
                            )}
                            <CampoMoeda label="Valor estimado" valor={editando.dados.valorEstimado} onValor={(v) => setEditando({ ...editando, dados: { ...editando.dados, valorEstimado: v } })} />
                            {erroBem && <Alert severity="error">{erroBem}</Alert>}
                        </Stack>
                    </DialogContent>
                )}
                <DialogActions>
                    <Button onClick={() => setEditando(null)}>Cancelar</Button>
                    <Button variant="contained" onClick={salvarBem}>Salvar</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
