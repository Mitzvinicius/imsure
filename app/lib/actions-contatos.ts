'use server'

import { createClient } from "@/utils/supabase/server";
import { PARENTESCOS, validarNovoParente, type EstadoCivil, type Parentesco } from "@/app/lib/contatos/parentesco";
import { validarEmail } from "@/app/corretoras/[corretoraId]/funis/masks";

function mensagemErro(error: { code?: string; message: string }) {
    if (error.code === "23505" && error.message.includes("contato_vinculos_par_key")) return "Esses contatos já estão vinculados.";
    if (error.code === "23505") return "Já existe um contato com esse CPF/CNPJ cadastrado nessa corretora.";
    if (error.code === "23514" && error.message.includes("contato_vinculos_diferentes_check")) return "Um contato não pode ser parente dele mesmo.";
    if (error.code === "42501") return "Você não tem permissão para alterar esse registro.";
    return error.message;
}

export type FichaContato = {
    nome: string;
    email: string | null;
    telefone: string | null;
    cpfCnpj: string | null;
    tipoPessoa: "fisica" | "juridica";
    dataNascimento: string | null;
    estadoCivil: EstadoCivil | null;
    rendaMensal: number | null;
    patrimonioImobilizado: number | null;
    patrimonioFinanceiro: number | null;
};

export async function atualizarFichaContato({ contatoId, dados }: { contatoId: string; dados: FichaContato }) {
    if (!dados.nome.trim()) return { error: "Informe o nome do contato." };
    if (dados.email && !validarEmail(dados.email)) return { error: "E-mail inválido." };

    const supabase = await createClient();
    const pf = dados.tipoPessoa === "fisica";
    const { error } = await supabase
        .from("contatos")
        .update({
            nome: dados.nome.trim(),
            email: dados.email,
            telefone: dados.telefone,
            cpf_cnpj: dados.cpfCnpj,
            tipo_pessoa: dados.tipoPessoa,
            data_nascimento: dados.dataNascimento,
            estado_civil: pf ? dados.estadoCivil : null,
            renda_mensal: pf ? dados.rendaMensal : null,
            patrimonio_imobilizado: pf ? dados.patrimonioImobilizado : null,
            patrimonio_financeiro: pf ? dados.patrimonioFinanceiro : null,
        })
        .eq("id", contatoId);
    return { error: error ? mensagemErro(error) : null };
}

export async function adicionarVinculo({
    corretoraId,
    contatoId,
    parentesco,
    parenteId,
    novoParente,
}: {
    corretoraId: string;
    contatoId: string;
    parentesco: Parentesco;
    parenteId: string | null;
    novoParente: { nome: string; telefone: string; email: string } | null;
}) {
    if (!PARENTESCOS.includes(parentesco)) return { error: "Escolha o grau de parentesco." };
    if (parenteId === contatoId) return { error: "Um contato não pode ser parente dele mesmo." };

    const supabase = await createClient();
    let idParente = parenteId;
    let criado = false;

    if (!idParente) {
        if (!novoParente) return { error: "Escolha um contato ou cadastre um novo." };
        const erro = validarNovoParente(novoParente);
        if (erro) return { error: erro };
        const { data, error } = await supabase
            .from("contatos")
            .insert({
                corretora_id: corretoraId,
                nome: novoParente.nome.trim(),
                telefone: novoParente.telefone || null,
                email: novoParente.email.trim() || null,
                tipo_pessoa: "fisica",
            })
            .select("id")
            .single();
        if (error || !data) return { error: error ? mensagemErro(error) : "Não foi possível cadastrar o parente." };
        idParente = data.id as string;
        criado = true;
    }

    const { error } = await supabase
        .from("contato_vinculos")
        .insert({ corretora_id: corretoraId, contato_id: contatoId, parente_id: idParente, parentesco });
    if (error) {
        if (criado) await supabase.from("contatos").delete().eq("id", idParente);
        // FK composta: os dois contatos precisam ser da mesma corretora
        if (error.code === "23503") return { error: "Contato não encontrado nesta corretora." };
        return { error: mensagemErro(error) };
    }
    return { error: null };
}

export async function removerVinculo({ vinculoId }: { vinculoId: string }) {
    const supabase = await createClient();
    const { error } = await supabase.from("contato_vinculos").delete().eq("id", vinculoId);
    return { error: error ? mensagemErro(error) : null };
}
