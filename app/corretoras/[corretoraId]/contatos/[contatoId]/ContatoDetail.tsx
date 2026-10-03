'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import FamilyRestroomOutlinedIcon from "@mui/icons-material/FamilyRestroomOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import { atualizarContatoBasico, atualizarFichaContato } from "@/app/lib/actions-contatos";
import Alert from "@mui/material/Alert";
import { usePermissoes } from "@/app/ui/design/PermissoesContext";
import type { ParenteDoContato } from "@/app/lib/contatos/parentesco";
import { initials, avatarColor } from "@/app/ui/design/avatar";
import { formatTelefone } from "../../funis/masks";
import AbaPrincipais from "./_components/AbaPrincipais";
import AbaFinanceiro from "./_components/AbaFinanceiro";
import AbaFamilia from "./_components/AbaFamilia";
import AbaSaude from "./_components/AbaSaude";
import type { ApoliceResumo, BemComApolices, ContatoFicha, Saude } from "./tipos";

type Aba = "principais" | "financeiro" | "familia" | "saude";

export default function ContatoDetail({
    corretoraId,
    contato,
    parentes,
    bens,
    apolicesVinculaveis,
    saude,
    produtosColegas,
    emCarteira,
    donoCarteira,
    abaInicial,
}: {
    corretoraId: string;
    contato: ContatoFicha;
    parentes: ParenteDoContato[];
    bens: BemComApolices[];
    apolicesVinculaveis: ApoliceResumo[];
    saude: Saude;
    produtosColegas: { tipo: string; ramo: string; situacao: string; responsavel_nome: string | null }[];
    emCarteira: boolean;
    donoCarteira: string | null;
    abaInicial: Aba;
}) {
    const router = useRouter();
    const [ficha, setFicha] = useState<ContatoFicha>(contato);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [salvo, setSalvo] = useState(false);
    const pf = ficha.tipoPessoa === "fisica";
    const { pode } = usePermissoes();
    const veSaude = pode("contatos.saude.ver");
    const fichaCompleta = pf && emCarteira;
    const [aba, setAba] = useState<Aba>(!fichaCompleta || (abaInicial === "saude" && !veSaude) ? "principais" : abaInicial);

    const set = (p: Partial<ContatoFicha>) => { setFicha((f) => ({ ...f, ...p })); setSalvo(false); };

    function trocarAba(nova: Aba) {
        setAba(nova);
        setErro(null);
        setSalvo(false);
        router.replace(`?aba=${nova}`, { scroll: false });
    }

    async function salvar() {
        setErro(null);
        setSalvando(true);
        try {
            const r = emCarteira
                ? await atualizarFichaContato({ contatoId: contato.id, dados: ficha })
                : await atualizarContatoBasico({ contatoId: contato.id, telefone: ficha.telefone, email: ficha.email });
            if (r.error) { setErro(r.error); return; }
            setSalvo(true);
            router.refresh();
        } catch {
            setErro("Não foi possível salvar. Tente de novo.");
        } finally {
            setSalvando(false);
        }
    }

    const estadoSalvar = { salvando, erro, salvo, onSalvar: salvar };

    return (
        <Box sx={{ p: 3, maxWidth: 1000 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(`/corretoras/${corretoraId}/contatos`)} sx={{ mb: 1 }}>Contatos</Button>

            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center", px: 3, pt: 3, pb: 2 }}>
                    <Avatar sx={{ width: 56, height: 56, fontSize: 20, bgcolor: avatarColor(ficha.nome) }}>{initials(ficha.nome)}</Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                            <Typography variant="h5" noWrap sx={{ fontWeight: 800 }}>{ficha.nome || "Sem nome"}</Typography>
                            <Chip size="small" label={pf ? "Pessoa física" : "Pessoa jurídica"} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" noWrap>
                            {[ficha.telefone && formatTelefone(ficha.telefone), ficha.email, ficha.cpfCnpj].filter(Boolean).join(" · ") || "Sem dados de contato"}
                        </Typography>
                        {produtosColegas.length > 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Também tem com colegas: {produtosColegas.map((p) => `${p.ramo} (${p.tipo === "negocio" ? "em negociação" : p.situacao}) · ${p.responsavel_nome ?? "—"}`).join(" · ")}
                            </Typography>
                        )}
                    </Box>
                </Stack>
                <Tabs value={aba} onChange={(_e, v) => trocarAba(v)} variant="scrollable" sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}>
                    <Tab value="principais" label="Principais" icon={<BadgeOutlinedIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 52 }} />
                    {fichaCompleta && <Tab value="financeiro" label="Financeiro" icon={<AccountBalanceWalletOutlinedIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 52 }} />}
                    {fichaCompleta && <Tab value="familia" label={`Família${parentes.length ? ` (${parentes.length})` : ""}`} icon={<FamilyRestroomOutlinedIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 52 }} />}
                    {fichaCompleta && veSaude && <Tab value="saude" label="Saúde" icon={<FavoriteBorderOutlinedIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 52 }} />}
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {!emCarteira && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Cliente da carteira de {produtosColegas.map((p) => p.responsavel_nome).filter(Boolean).filter((n, i, a) => a.indexOf(n) === i).join(", ") || donoCarteira || "outro produtor"}. Você pode corrigir telefone e e-mail; as demais informações ficam com quem atende o cliente.
                        </Alert>
                    )}
                    {aba === "principais" && <AbaPrincipais ficha={ficha} set={set} somenteContato={!emCarteira} {...estadoSalvar} />}
                    {aba === "financeiro" && pf && (
                        <AbaFinanceiro corretoraId={corretoraId} ficha={ficha} set={set} bens={bens} apolicesVinculaveis={apolicesVinculaveis} {...estadoSalvar} />
                    )}
                    {aba === "familia" && pf && <AbaFamilia corretoraId={corretoraId} contato={ficha} parentes={parentes} />}
                    {aba === "saude" && pf && veSaude && <AbaSaude corretoraId={corretoraId} contatoId={contato.id} saude={saude} />}
                </Box>
            </Paper>
        </Box>
    );
}
