'use client';
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import CheckIcon from "@mui/icons-material/Check";
import KanbanView from "./KanbanView";
import ListView from "./ListView";
import NewDealModal from "./NewDealModal";
import DealDetail from "./DealDetail";
import FilterPanel from "./FilterPanel";
import { contarFiltrosAtivos, FILTROS_PADRAO, negocioPassaNoFiltro, nomeCookieFiltros, type Filtros } from "./filtros";
import { definirFunilAtivo, moverNegocio } from "@/app/lib/actions";
import { Etapa, Fluxo, Negocio } from "./types";
import { formatBRL } from "./constants";

export default function FunisPage({
    corretoraId,
    corretoraNome,
    ramosAtuacao,
    fluxosIniciais,
    etapasIniciais,
    negociosIniciais,
    filtrosIniciais,
}: {
    corretoraId: string;
    corretoraNome: string;
    nomeUsuario: string;
    ramosAtuacao: string[];
    fluxosIniciais: Fluxo[];
    etapasIniciais: Etapa[];
    negociosIniciais: Negocio[];
    filtrosIniciais: Filtros;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [view, setView] = useState<"kanban" | "lista">("kanban");
    const [busca, setBusca] = useState("");
    const [filtros, setFiltrosEstado] = useState<Filtros>(filtrosIniciais);

    // Lembra o último filtro por corretora (lido de volta no servidor em page.tsx).
    function setFiltros(f: Filtros) {
        setFiltrosEstado(f);
        document.cookie = `${nomeCookieFiltros(corretoraId)}=${encodeURIComponent(JSON.stringify(f))}; path=/; max-age=31536000; samesite=lax`;
    }
    const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
    const [fluxoAnchor, setFluxoAnchor] = useState<HTMLElement | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [negocios, setNegocios] = useState(negociosIniciais);
    const [trocandoFunil, setTrocandoFunil] = useState(false);

    useEffect(() => {
        setNegocios(negociosIniciais);
    }, [negociosIniciais]);

    const fluxoAtivo = fluxosIniciais.find((f) => f.ativo) ?? fluxosIniciais[0] ?? null;

    const negocioIdSelecionado = searchParams.get("negocio");
    const negocioSelecionado = negocios.find((n) => n.id === negocioIdSelecionado) ?? null;

    function abrirNegocio(id: string) {
        router.push(`${pathname}?negocio=${id}`);
    }
    function fecharDetalhe() {
        router.push(pathname);
    }

    const negociosFiltrados = useMemo(
        () => negocios.filter((n) => negocioPassaNoFiltro(n, busca, filtros)),
        [negocios, busca, filtros],
    );

    const activeFilterCount = contarFiltrosAtivos(filtros);
    const totalPipeline = negociosFiltrados.reduce((s, d) => s + Number(d.valor || 0), 0);

    async function trocarFluxo(fluxoId: string) {
        setFluxoAnchor(null);
        if (fluxoId === fluxoAtivo?.id) return;
        setTrocandoFunil(true);
        await definirFunilAtivo({ corretoraId, fluxoId });
        router.refresh();
    }

    async function moverDeal(negocioId: string, etapaId: string) {
        setNegocios((prev) => prev.map((n) => (n.id === negocioId ? { ...n, etapa_id: etapaId } : n)));
        await moverNegocio({ negocioId, etapaId });
    }

    if (negocioSelecionado) {
        return (
            <DealDetail
                negocio={negocioSelecionado}
                etapas={etapasIniciais}
                ramosAtuacao={ramosAtuacao}
                corretoraNome={corretoraNome}
                onClose={fecharDetalhe}
                onSaved={() => { fecharDetalhe(); router.refresh(); }}
                onDeleted={() => { fecharDetalhe(); router.refresh(); }}
            />
        );
    }

    return (
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", px: 3, py: 2, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider", flexWrap: "wrap" }}
            >
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Negócios</Typography>
                    <Typography variant="caption" color="text.secondary">{formatBRL(totalPipeline)} {activeFilterCount === 0 && !busca.trim() ? "em pipeline ativo" : "nos negócios filtrados"}</Typography>
                </Box>

                <Button
                    onClick={(e) => setFluxoAnchor(e.currentTarget)}
                    endIcon={<ExpandMoreIcon />}
                    variant="outlined"
                    color="inherit"
                    disabled={trocandoFunil}
                >
                    {fluxoAtivo?.nome ?? "Sem funil"}
                </Button>
                <Menu anchorEl={fluxoAnchor} open={!!fluxoAnchor} onClose={() => setFluxoAnchor(null)}>
                    {fluxosIniciais.map((f) => (
                        <MenuItem key={f.id} selected={f.id === fluxoAtivo?.id} onClick={() => trocarFluxo(f.id)}>
                            {f.id === fluxoAtivo?.id && <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>}
                            {f.nome}
                        </MenuItem>
                    ))}
                    <Divider />
                    <MenuItem disabled>
                        <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
                        Adicionar funil
                    </MenuItem>
                </Menu>

                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
                    Criar negócio
                </Button>

                <ToggleButtonGroup size="small" value={view} exclusive onChange={(_, v) => v && setView(v)}>
                    <ToggleButton value="kanban"><ViewKanbanOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} /> Kanban</ToggleButton>
                    <ToggleButton value="lista"><ViewListOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} /> Lista</ToggleButton>
                </ToggleButtonGroup>

                <Box sx={{ flex: 1 }} />

                <TextField
                    size="small"
                    placeholder="Buscar por contato"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                    sx={{ minWidth: 220 }}
                />

                <IconButton onClick={(e) => setFilterAnchor(e.currentTarget)} title="Filtros">
                    <Badge badgeContent={activeFilterCount} color="secondary">
                        <FilterListIcon />
                    </Badge>
                </IconButton>
                <FilterPanel
                    anchorEl={filterAnchor}
                    onClose={() => setFilterAnchor(null)}
                    filtros={filtros}
                    onChange={setFiltros}
                    onClear={() => setFiltros(FILTROS_PADRAO)}
                    ramosAtuacao={ramosAtuacao}
                />
            </Stack>

            {!fluxoAtivo ? (
                <Box sx={{ flex: 1, display: "grid", placeItems: "center", color: "text.disabled" }}>
                    <Typography>Nenhum funil configurado ainda.</Typography>
                </Box>
            ) : view === "kanban" ? (
                <KanbanView etapas={etapasIniciais} negocios={negociosFiltrados} onOpen={abrirNegocio} onMove={moverDeal} />
            ) : (
                <ListView etapas={etapasIniciais} negocios={negociosFiltrados} onOpen={abrirNegocio} />
            )}

            <NewDealModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={() => { setModalOpen(false); router.refresh(); }}
                corretoraId={corretoraId}
                etapas={etapasIniciais}
                ramosAtuacao={ramosAtuacao}
            />
        </Box>
    );
}
