'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { cancelarApolice } from "@/app/lib/actions-seguros";
import { COR_STATUS_APOLICE, LABEL_STATUS_APOLICE, type StatusApolice } from "@/app/lib/seguros/status";
import { LABEL_STATUS_SINISTRO } from "@/app/lib/seguros/sinistros";
import { formatData, hojeSaoPaulo } from "@/app/lib/seguros/datas";
import { LABEL_FORMA_PAGAMENTO, type ApoliceForm, type Cobertura, type ContatoResumo, type Endosso, type Parcela, type SinistroLinha } from "@/app/lib/seguros/types";
import { formatBRL } from "../../funis/constants";
import ParcelasTab from "../_components/ParcelasTab";
import EndossosTab from "../_components/EndossosTab";
import AnexosApoliceTab from "../_components/AnexosApoliceTab";

function Campo({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
    return (
        <Box sx={{ minWidth: 180 }}>
            <Typography variant="caption" color="text.secondary">{rotulo}</Typography>
            <Typography>{valor}</Typography>
        </Box>
    );
}

function resumoBem(form: ApoliceForm): string {
    const b = form.bem;
    if (b.tipo === "livre") return b.descricao || "—";
    if (b.tipo === "auto") return b.itens.map((i) => [i.marca, i.modelo, i.ano_modelo, i.placa].filter(Boolean).join(" ")).join("; ") || "—";
    if (b.tipo === "residencial") return b.itens.map((i) => [i.logradouro, i.numero, i.cidade, i.uf].filter(Boolean).join(", ")).join("; ") || "—";
    if (b.tipo === "rc") return b.itens.map((i) => i.atividade).join("; ") || "—";
    return b.itens.map((v) => `${v.nome} (${v.beneficiarios.length} beneficiário(s))`).join("; ") || "—";
}

export default function ApoliceDetail(props: {
    corretoraId: string;
    apoliceId: string;
    form: ApoliceForm;
    contato: ContatoResumo;
    seguradora: { nome: string; telefone_assistencia: string | null; telefone_sinistro: string | null };
    canceladaEm: string | null;
    status: StatusApolice;
    anterior: { id: string; numero: string } | null;
    renovacao: { id: string; numero: string } | null;
    parcelas: Parcela[];
    endossos: Endosso[];
    coberturasEndosso: Cobertura[];
    sinistros: SinistroLinha[];
    abaInicial: string;
    bensPatrimonio: { id: string; descricao: string; tipo: string }[];
    responsavelNome: string;
}) {
    const { corretoraId, apoliceId, form } = props;
    const router = useRouter();
    const [aba, setAba] = useState(props.abaInicial);
    const [erro, setErro] = useState<string | null>(null);
    const base = `/corretoras/${corretoraId}`;
    const mostrarBoleto = form.formaPagamento === "boleto";

    async function alternarCancelamento() {
        setErro(null);
        const r = await cancelarApolice({ apoliceId, data: props.canceladaEm ? null : hojeSaoPaulo() });
        if (r.error) setErro(r.error); else router.refresh();
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1100 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(`${base}/apolices`)} sx={{ mb: 1 }}>Apólices</Button>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{props.seguradora.nome} · {form.numero}</Typography>
                    <Chip label={LABEL_STATUS_APOLICE[props.status]} color={COR_STATUS_APOLICE[props.status]} />
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button color={props.canceladaEm ? "primary" : "error"} onClick={alternarCancelamento}>
                        {props.canceladaEm ? "Reativar" : "Cancelar apólice"}
                    </Button>
                    <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => router.push(`${base}/apolices/${apoliceId}/editar`)}>Editar</Button>
                </Stack>
            </Stack>
            {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

            <Tabs value={aba} onChange={(_e, v) => setAba(v)} sx={{ mb: 2 }}>
                <Tab value="resumo" label="Resumo" />
                <Tab value="parcelas" label={`Parcelas (${props.parcelas.length})`} />
                <Tab value="endossos" label={`Endossos (${props.endossos.length})`} />
                <Tab value="sinistros" label={`Sinistros (${props.sinistros.length})`} />
                <Tab value="anexos" label="Anexos" />
            </Tabs>

            <Paper variant="outlined" sx={{ p: 2.5 }}>
                {aba === "resumo" && (
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap", rowGap: 2 }}>
                            <Campo rotulo="Cliente" valor={props.contato.nome} />
                            <Campo rotulo="Responsável" valor={props.responsavelNome} />
                            <Campo rotulo="Ramo" valor={form.ramo} />
                            <Campo rotulo="Vigência" valor={`${formatData(form.inicioVigencia)} – ${formatData(form.fimVigencia)}`} />
                            <Campo rotulo="Prêmio" valor={form.premio != null ? formatBRL(form.premio) : "—"} />
                            <Campo rotulo="Comissão" valor={form.percentualComissao != null ? `${String(form.percentualComissao).replace(".", ",")}%` : "—"} />
                            <Campo rotulo="Pagamento" valor={LABEL_FORMA_PAGAMENTO[form.formaPagamento]} />
                            <Campo rotulo="Assistência 24h" valor={props.seguradora.telefone_assistencia ?? "—"} />
                            <Campo rotulo="Telefone de sinistro" valor={props.seguradora.telefone_sinistro ?? "—"} />
                        </Stack>
                        <Campo rotulo="Bem segurado" valor={resumoBem(form)} />
                        <Box>
                            <Typography variant="caption" color="text.secondary">Coberturas</Typography>
                            {!form.coberturas.length && <Typography>—</Typography>}
                            {form.coberturas.map((c, i) => (
                                <Typography key={i}>
                                    • {c.nome}{c.importancia_segurada != null ? ` — IS ${formatBRL(c.importancia_segurada)}` : ""}{c.franquia != null ? ` — franquia ${formatBRL(c.franquia)}` : ""}
                                </Typography>
                            ))}
                        </Box>
                        {props.bensPatrimonio.length > 0 && (
                            <Campo
                                rotulo="Bens do patrimônio do cliente"
                                valor={
                                    <Link component={NextLink} href={`${base}/contatos/${props.contato.id}?aba=financeiro`}>
                                        {props.bensPatrimonio.map((b) => b.descricao).join(", ")}
                                    </Link>
                                }
                            />
                        )}
                        <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
                            {form.negocioOrigemId && <Link component={NextLink} href={`${base}/funis?negocio=${form.negocioOrigemId}`}>Ver negócio de origem</Link>}
                            {props.anterior && <Link component={NextLink} href={`${base}/apolices/${props.anterior.id}`}>Apólice anterior ({props.anterior.numero})</Link>}
                            {props.renovacao && <Link component={NextLink} href={`${base}/apolices/${props.renovacao.id}`}>Renovada pela apólice {props.renovacao.numero}</Link>}
                        </Stack>
                    </Stack>
                )}
                {aba === "parcelas" && <ParcelasTab apoliceId={apoliceId} parcelas={props.parcelas} endossos={props.endossos} mostrarBoleto={mostrarBoleto} premio={form.premio} percentualComissao={form.percentualComissao} />}
                {aba === "endossos" && (
                    <EndossosTab apoliceId={apoliceId} endossos={props.endossos} coberturasEndosso={props.coberturasEndosso} percentualComissao={form.percentualComissao} mostrarBoleto={mostrarBoleto} />
                )}
                {aba === "sinistros" && (
                    <Stack spacing={1.5}>
                        <Button variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => router.push(`${base}/sinistros/novo?apoliceId=${apoliceId}`)}>Abrir sinistro</Button>
                        {!props.sinistros.length && <Typography color="text.secondary">Nenhum sinistro nesta apólice.</Typography>}
                        {props.sinistros.map((s) => (
                            <Link key={s.id} component={NextLink} href={`${base}/sinistros/${s.id}`}>
                                {formatData(s.data_ocorrencia)} · {s.tipo} · {LABEL_STATUS_SINISTRO[s.status]}
                            </Link>
                        ))}
                    </Stack>
                )}
                {aba === "anexos" && <AnexosApoliceTab apoliceId={apoliceId} />}
            </Paper>
        </Box>
    );
}
