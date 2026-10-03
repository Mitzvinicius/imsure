'use server'

import { createClient } from "@/utils/supabase/server";
import { PARENTESCOS, validarNovoParente, type EstadoCivil, type Parentesco } from "@/app/lib/contatos/parentesco";
import { validarEmail } from "@/app/corretoras/[corretoraId]/funis/masks";
import { ramoPodeVincularBem, type TipoBemPatrimonio } from "@/app/lib/contatos/patrimonio";

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

export type BemPatrimonioForm = {
    tipo: TipoBemPatrimonio;
    descricao: string;
    valorEstimado: number | null;
    placa: string | null;
    endereco: string | null;
};

export async function salvarBemPatrimonio({
    corretoraId,
    contatoId,
    bemId,
    dados,
}: {
    corretoraId: string;
    contatoId: string;
    bemId: string | null;
    dados: BemPatrimonioForm;
}) {
    if (!dados.descricao.trim()) return { error: "Descreva o bem (ex.: Casa na praia, Honda Civic 2022)." };
    const linha = {
        tipo: dados.tipo,
        descricao: dados.descricao.trim(),
        valor_estimado: dados.valorEstimado,
        placa: dados.tipo === "veiculo" ? dados.placa?.trim().toUpperCase() || null : null,
        endereco: dados.tipo === "imovel" ? dados.endereco?.trim() || null : null,
    };
    const supabase = await createClient();
    const { error } = bemId
        ? await supabase.from("contato_bens").update(linha).eq("id", bemId).eq("contato_id", contatoId)
        : await supabase.from("contato_bens").insert({ ...linha, corretora_id: corretoraId, contato_id: contatoId });
    if (error?.code === "23503") return { error: "Contato não encontrado nesta corretora." };
    return { error: error ? mensagemErro(error) : null };
}

export async function removerBemPatrimonio({ bemId }: { bemId: string }) {
    const supabase = await createClient();
    const { error } = await supabase.from("contato_bens").delete().eq("id", bemId);
    return { error: error ? mensagemErro(error) : null };
}

export async function vincularBemApolice({ bemId, apoliceId }: { bemId: string; apoliceId: string }) {
    const supabase = await createClient();
    const { data: bem } = await supabase.from("contato_bens").select("contato_id").eq("id", bemId).maybeSingle();
    if (!bem) return { error: "Bem não encontrado." };
    const { data: apolice } = await supabase
        .from("apolices")
        .select("ramo")
        .eq("id", apoliceId)
        .eq("contato_id", bem.contato_id)
        .maybeSingle();
    if (!apolice) return { error: "A apólice precisa ser deste cliente." };
    if (!ramoPodeVincularBem(apolice.ramo as string)) return { error: "Só apólices de automóvel, residencial ou empresarial podem ser vinculadas a bens." };

    const { error } = await supabase.from("contato_bem_apolices").insert({ bem_id: bemId, apolice_id: apoliceId, contato_id: bem.contato_id });
    if (error?.code === "23505") return { error: "Essa apólice já está vinculada a este bem." };
    return { error: error ? mensagemErro(error) : null };
}

export async function desvincularBemApolice({ bemId, apoliceId }: { bemId: string; apoliceId: string }) {
    const supabase = await createClient();
    const { error } = await supabase.from("contato_bem_apolices").delete().eq("bem_id", bemId).eq("apolice_id", apoliceId);
    return { error: error ? mensagemErro(error) : null };
}

export async function salvarSaude({
    corretoraId,
    contatoId,
    pesoKg,
    alturaM,
}: {
    corretoraId: string;
    contatoId: string;
    pesoKg: number | null;
    alturaM: number | null;
}) {
    if (pesoKg != null && !(pesoKg > 0 && pesoKg < 700)) return { error: "Peso inválido." };
    if (alturaM != null && !(alturaM > 0 && alturaM < 3)) return { error: "Altura inválida." };
    const supabase = await createClient();
    const { error } = await supabase
        .from("contato_saude")
        .upsert({ contato_id: contatoId, corretora_id: corretoraId, peso_kg: pesoKg, altura_m: alturaM, atualizado_em: new Date().toISOString() });
    if (error?.code === "23503") return { error: "Contato não encontrado nesta corretora." };
    return { error: error ? mensagemErro(error) : null };
}
