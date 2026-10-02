import { createClient } from "@/utils/supabase/server";
import { RAMOS_OPCOES } from "@/app/lib/seguros/ramos";
import type { ContatoResumo, Seguradora } from "@/app/lib/seguros/types";
import ApoliceForm from "../_components/ApoliceForm";
import { bemVazioParaRamo } from "@/app/lib/seguros/bem";
import { formVazio } from "../_components/carregarApolice";

export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ corretoraId: string }>;
    searchParams: Promise<{ negocioId?: string }>;
}) {
    const { corretoraId } = await params;
    const { negocioId } = await searchParams;
    const supabase = await createClient();

    const [{ data: seguradoras }, { data: corretora }] = await Promise.all([
        supabase.from("seguradoras").select("id, nome, telefone_assistencia, telefone_sinistro").eq("ativa", true).order("nome"),
        supabase.from("corretoras").select("ramos_atuacao").eq("id", corretoraId).single(),
    ]);
    const listaSeguradoras = (seguradoras ?? []) as Seguradora[];
    const ramosCorretora = (corretora?.ramos_atuacao as string[] | null) ?? [];
    const ramos = ramosCorretora.length ? ramosCorretora : [...RAMOS_OPCOES];

    const inicial = formVazio();
    let contatoInicial: ContatoResumo | null = null;

    if (negocioId) {
        const { data: n } = await supabase
            .from("negocios")
            .select("id, ramo, seguradora, valor, apolice_renovada_id, contato:contatos(id, nome, cpf_cnpj)")
            .eq("id", negocioId)
            .maybeSingle();
        if (n) {
            contatoInicial = n.contato as unknown as ContatoResumo;
            const seg = listaSeguradoras.find((s) => s.nome.toLowerCase() === ((n.seguradora as string | null) ?? "").toLowerCase());
            Object.assign(inicial, {
                contatoId: contatoInicial.id,
                ramo: n.ramo as string,
                seguradoraId: seg?.id ?? "",
                premio: n.valor as number | null,
                negocioOrigemId: n.id as string,
                apoliceAnteriorId: (n.apolice_renovada_id as string | null) ?? null,
                bem: bemVazioParaRamo(n.ramo as string),
            });
        }
    }

    return <ApoliceForm corretoraId={corretoraId} modo="criar" inicial={inicial} contatoInicial={contatoInicial} seguradoras={listaSeguradoras} ramos={ramos} />;
}
