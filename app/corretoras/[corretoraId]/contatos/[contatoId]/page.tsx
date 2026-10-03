import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { parentesDoContato, type EstadoCivil, type VinculoBanco } from "@/app/lib/contatos/parentesco";
import ContatoDetail, { type ContatoFicha } from "./ContatoDetail";

export default async function Page({ params }: { params: Promise<{ corretoraId: string; contatoId: string }> }) {
    const { corretoraId, contatoId } = await params;
    const supabase = await createClient();

    const { data: c } = await supabase
        .from("contatos")
        .select("id, nome, email, telefone, cpf_cnpj, tipo_pessoa, data_nascimento, estado_civil, renda_mensal, patrimonio_imobilizado, patrimonio_financeiro")
        .eq("id", contatoId)
        .eq("corretora_id", corretoraId)
        .maybeSingle();
    if (!c) notFound();

    const pessoa = "id, nome, telefone, email";
    const { data: vinculos } = await supabase
        .from("contato_vinculos")
        .select(`id, parentesco, contato:contatos!contato_vinculos_contato_fkey(${pessoa}), parente:contatos!contato_vinculos_parente_fkey(${pessoa})`)
        .or(`contato_id.eq.${contatoId},parente_id.eq.${contatoId}`);

    const ficha: ContatoFicha = {
        id: c.id as string,
        nome: c.nome as string,
        email: c.email as string | null,
        telefone: c.telefone as string | null,
        cpfCnpj: c.cpf_cnpj as string | null,
        tipoPessoa: c.tipo_pessoa as "fisica" | "juridica",
        dataNascimento: c.data_nascimento as string | null,
        estadoCivil: c.estado_civil as EstadoCivil | null,
        rendaMensal: c.renda_mensal != null ? Number(c.renda_mensal) : null,
        patrimonioImobilizado: c.patrimonio_imobilizado != null ? Number(c.patrimonio_imobilizado) : null,
        patrimonioFinanceiro: c.patrimonio_financeiro != null ? Number(c.patrimonio_financeiro) : null,
    };

    return (
        <ContatoDetail
            corretoraId={corretoraId}
            contato={ficha}
            parentes={parentesDoContato(contatoId, (vinculos ?? []) as unknown as VinculoBanco[])}
        />
    );
}
