import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getMembrosAtivos } from "@/app/lib/equipe/sessao";
import { lerFiltrosSalvos, nomeCookieFiltros } from "./filtros";
import FunisPage from "./FunisPage";
import type { Etapa, Fluxo, Negocio } from "./types";
import type { DetalheNegocio } from "./link";

const SELECT_NEGOCIO = "id, etapa_id, tipo, ramo, seguradora, origem, grupo_producao, valor, indicacao, criado_em, fechado_em, apolice_renovada_id, status, motivo_perda, observacao_perda, contato:contatos(id, nome, telefone, email, cpf_cnpj, tipo_pessoa, profissoes), vendedor:usuarios(id, nome), apolice_emitida:apolices!apolices_negocio_origem_id_fkey(id)";
type NegocioBruto = Omit<Negocio, "apolice_emitida_id"> & { apolice_emitida: { id: string } | { id: string }[] | null };
function normalizarNegocio({ apolice_emitida, ...n }: NegocioBruto): Negocio {
    return { ...n, apolice_emitida_id: Array.isArray(apolice_emitida) ? (apolice_emitida[0]?.id ?? null) : (apolice_emitida?.id ?? null) };
}

export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ corretoraId: string }>;
    searchParams: Promise<{ negocio?: string }>;
}) {
    const { corretoraId } = await params;
    const { negocio: negocioLinkId } = await searchParams;
    const supabase = await createClient();
    const cookieFiltros = (await cookies()).get(nomeCookieFiltros(corretoraId))?.value;
    const filtrosIniciais = lerFiltrosSalvos(cookieFiltros?.startsWith("%") ? decodeURIComponent(cookieFiltros) : cookieFiltros);

    const { data: { user } } = await supabase.auth.getUser();
    const nomeUsuario = (user?.user_metadata?.nome as string | undefined) ?? user?.email ?? "Você";

    const { data: corretora } = await supabase
        .from("corretoras")
        .select("nome, ramos_atuacao")
        .eq("id", corretoraId)
        .single();

    const { data: fluxosData } = await supabase
        .from("fluxos")
        .select("id, nome, ativo")
        .eq("corretora_id", corretoraId)
        .order("criado_em", { ascending: true });

    const fluxos = (fluxosData ?? []) as Fluxo[];
    const fluxoAtivo = fluxos.find((f) => f.ativo) ?? fluxos[0] ?? null;

    let etapas: Etapa[] = [];
    let negocios: Negocio[] = [];

    if (fluxoAtivo) {
        const { data: etapasData } = await supabase
            .from("etapas")
            .select("id, nome, ordem")
            .eq("fluxo_id", fluxoAtivo.id)
            .order("ordem", { ascending: true });
        etapas = (etapasData ?? []) as Etapa[];

        const etapaIds = etapas.map((e) => e.id);
        if (etapaIds.length) {
            const { data: negociosData } = await supabase
                .from("negocios")
                .select(SELECT_NEGOCIO)
                .in("etapa_id", etapaIds)
                .order("criado_em", { ascending: false });
            negocios = ((negociosData ?? []) as unknown as NegocioBruto[]).map(normalizarNegocio);
        }
    }

    // Link direto (ex.: notificação) para negócio de outro funil: abre com as etapas do funil dele, sem trocar o funil ativo
    let negocioForaDoFunil: DetalheNegocio | null = null;
    if (negocioLinkId && !negocios.some((n) => n.id === negocioLinkId)) {
        const { data } = await supabase.from("negocios").select(SELECT_NEGOCIO).eq("id", negocioLinkId).maybeSingle();
        if (data) {
            const negocio = normalizarNegocio(data as unknown as NegocioBruto);
            const { data: etapaDoNegocio } = await supabase.from("etapas").select("fluxo_id, fluxos(corretora_id)").eq("id", negocio.etapa_id).maybeSingle();
            const fluxo = etapaDoNegocio as unknown as { fluxo_id: string; fluxos: { corretora_id: string } | null } | null;
            if (fluxo && fluxo.fluxos?.corretora_id === corretoraId) {
                const { data: etapasDoFluxo } = await supabase.from("etapas").select("id, nome, ordem").eq("fluxo_id", fluxo.fluxo_id).order("ordem", { ascending: true });
                negocioForaDoFunil = { negocio, etapas: (etapasDoFluxo ?? []) as Etapa[] };
            }
        }
    }

    return (
        <FunisPage
            corretoraId={corretoraId}
            corretoraNome={corretora?.nome ?? ""}
            nomeUsuario={nomeUsuario}
            ramosAtuacao={(corretora?.ramos_atuacao as string[] | null) ?? []}
            fluxosIniciais={fluxos}
            etapasIniciais={etapas}
            negociosIniciais={negocios}
            filtrosIniciais={filtrosIniciais}
            membros={await getMembrosAtivos(corretoraId)}
            negocioForaDoFunil={negocioForaDoFunil}
        />
    );
}
