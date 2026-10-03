import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { parentesDoContato, type EstadoCivil, type VinculoBanco } from "@/app/lib/contatos/parentesco";
import { ramoPodeVincularBem, type TipoBemPatrimonio } from "@/app/lib/contatos/patrimonio";
import { calcularStatusApolice } from "@/app/lib/seguros/status";
import { hojeSaoPaulo } from "@/app/lib/seguros/datas";
import ContatoDetail from "./ContatoDetail";
import type { ApoliceResumo, BemComApolices, ContatoFicha } from "./tipos";

const ABAS = ["principais", "financeiro", "familia", "saude"] as const;

export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ corretoraId: string; contatoId: string }>;
    searchParams: Promise<{ aba?: string }>;
}) {
    const { corretoraId, contatoId } = await params;
    const { aba } = await searchParams;
    const supabase = await createClient();

    const { data: c } = await supabase
        .from("contatos")
        .select("id, nome, email, telefone, cpf_cnpj, tipo_pessoa, data_nascimento, estado_civil, criador:usuarios!contatos_criado_por_usuario_id_fkey(nome)")
        .eq("id", contatoId)
        .eq("corretora_id", corretoraId)
        .maybeSingle();
    if (!c) notFound();

    const pessoa = "id, nome, telefone, email";
    const [{ data: vinculos }, { data: bens }, { data: apolices }, { data: saude }, { data: produtos }, { data: financeiro }, { data: emCarteira }] = await Promise.all([
        supabase
            .from("contato_vinculos")
            .select(`id, parentesco, contato:contatos!contato_vinculos_contato_fkey(${pessoa}), parente:contatos!contato_vinculos_parente_fkey(${pessoa})`)
            .or(`contato_id.eq.${contatoId},parente_id.eq.${contatoId}`),
        supabase
            .from("contato_bens")
            .select("id, tipo, descricao, valor_estimado, placa, endereco, contato_bem_apolices(apolice_id)")
            .eq("contato_id", contatoId)
            .order("criado_em"),
        supabase
            .from("apolices")
            .select("id, numero, ramo, fim_vigencia, cancelada_em, seguradora:seguradoras(nome)")
            .eq("contato_id", contatoId)
            .order("fim_vigencia", { ascending: false }),
        supabase.from("contato_saude").select("peso_kg, altura_m, atualizado_em").eq("contato_id", contatoId).maybeSingle(),
        supabase.rpc("produtos_do_contato_resumo", { p_contato_id: contatoId }),
        supabase.from("contato_financeiro").select("renda_mensal, patrimonio_financeiro").eq("contato_id", contatoId).maybeSingle(),
        supabase.rpc("usuario_ve_contato", { p_contato_id: contatoId }),
    ]);

    const idsApolices = (apolices ?? []).map((a) => a.id as string);
    const { data: renovadas } = idsApolices.length
        ? await supabase.from("apolices").select("apolice_anterior_id").in("apolice_anterior_id", idsApolices)
        : { data: [] as { apolice_anterior_id: string }[] };
    const setRenovadas = new Set((renovadas ?? []).map((r) => r.apolice_anterior_id as string));
    const hoje = hojeSaoPaulo();

    const resumos = new Map<string, ApoliceResumo>(
        (apolices ?? []).map((a) => [
            a.id as string,
            {
                id: a.id as string,
                numero: a.numero as string,
                ramo: a.ramo as string,
                seguradora: (a.seguradora as unknown as { nome: string } | null)?.nome ?? "—",
                status: calcularStatusApolice({
                    canceladaEm: a.cancelada_em as string | null,
                    fimVigencia: a.fim_vigencia as string,
                    foiRenovada: setRenovadas.has(a.id as string),
                    hoje,
                }),
            },
        ]),
    );

    const bensComApolices: BemComApolices[] = (bens ?? []).map((b) => ({
        id: b.id as string,
        tipo: b.tipo as TipoBemPatrimonio,
        descricao: b.descricao as string,
        valor_estimado: b.valor_estimado != null ? Number(b.valor_estimado) : null,
        placa: b.placa as string | null,
        endereco: b.endereco as string | null,
        apolices: ((b.contato_bem_apolices ?? []) as { apolice_id: string }[])
            .map((l) => resumos.get(l.apolice_id))
            .filter((a): a is ApoliceResumo => !!a),
    }));

    const ficha: ContatoFicha = {
        id: c.id as string,
        nome: c.nome as string,
        email: c.email as string | null,
        telefone: c.telefone as string | null,
        cpfCnpj: c.cpf_cnpj as string | null,
        tipoPessoa: c.tipo_pessoa as "fisica" | "juridica",
        dataNascimento: c.data_nascimento as string | null,
        estadoCivil: c.estado_civil as EstadoCivil | null,
        rendaMensal: financeiro?.renda_mensal != null ? Number(financeiro.renda_mensal) : null,
        patrimonioFinanceiro: financeiro?.patrimonio_financeiro != null ? Number(financeiro.patrimonio_financeiro) : null,
    };

    return (
        <ContatoDetail
            corretoraId={corretoraId}
            contato={ficha}
            parentes={parentesDoContato(contatoId, (vinculos ?? []) as unknown as VinculoBanco[])}
            bens={bensComApolices}
            apolicesVinculaveis={[...resumos.values()].filter((a) => ramoPodeVincularBem(a.ramo))}
            saude={{
                pesoKg: saude?.peso_kg != null ? Number(saude.peso_kg) : null,
                alturaM: saude?.altura_m != null ? Number(saude.altura_m) : null,
                atualizadoEm: (saude?.atualizado_em as string | undefined) ?? null,
            }}
            produtosColegas={((produtos ?? []) as { tipo: string; ramo: string; situacao: string; responsavel_nome: string | null; meu: boolean }[]).filter((p) => !p.meu)}
            emCarteira={emCarteira === true}
            donoCarteira={(c.criador as unknown as { nome: string } | null)?.nome ?? null}
            abaInicial={(ABAS as readonly string[]).includes(aba ?? "") ? (aba as (typeof ABAS)[number]) : "principais"}
        />
    );
}
