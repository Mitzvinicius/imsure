'use server'

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

function mensagemErroContato(error: { code?: string; message: string }) {
    if (error.code === "23505") {
        return "Já existe um contato com esse CPF/CNPJ cadastrado nessa corretora.";
    }
    return error.message;
}

export async function criarConta({ nome }: { nome: string }) {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const usuario = await supabase.auth.getUser();

    if (!usuario.data.user) {
        return { error: "Usuario não encontrado" };
    }

    const { data: plano } = await supabase
        .from("planos")
        .select("id")
        .eq("nome", "Starter")
        .single();

    if (!plano) {
        return { error: "Plano padrão não encontrado" };
    }

    const { data: novaConta, error: erroConta } = await supabase
        .from("contas")
        .insert({ nome, plano_id: plano.id, owner_usuario_id: usuario.data.user.id })
        .select()
        .single();

    if (erroConta || !novaConta) {
        return { error: erroConta?.message ?? "Não foi possível criar a conta" };
    }

    const { error: erroCorretora } = await supabase
        .from("corretoras")
        .insert({ nome, conta_id: novaConta.id })
        .select()
        .single();

    if (erroCorretora) {
        return { error: erroCorretora.message };
    }

    return { error: null };
}

export async function atualizarDadosCorretora({
    corretoraId,
    nome,
    cnpj,
    registroSusep,
}: {
    corretoraId: string;
    nome: string;
    cnpj: string;
    registroSusep: string;
}) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { error } = await supabase
        .from("corretoras")
        .update({ nome, cnpj, registro_susep: registroSusep })
        .eq("id", corretoraId);

    if (error) {
        return { error: error.message };
    }
    return { error: null };
}

export async function salvarRamosAtuacao({
    corretoraId,
    ramos,
}: {
    corretoraId: string;
    ramos: string[];
}) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { error } = await supabase
        .from("corretoras")
        .update({ ramos_atuacao: ramos })
        .eq("id", corretoraId);

    if (error) {
        return { error: error.message };
    }
    return { error: null };
}

export async function salvarFluxoVendas({
    corretoraId,
    etapas,
}: {
    corretoraId: string;
    etapas: string[];
}) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { data: fluxoExistente } = await supabase
        .from("fluxos")
        .select("id")
        .eq("corretora_id", corretoraId)
        .maybeSingle();

    let fluxoId = fluxoExistente?.id as string | undefined;

    if (!fluxoId) {
        const { data: novoFluxo, error: erroFluxo } = await supabase
            .from("fluxos")
            .insert({ corretora_id: corretoraId, nome: "Funil principal" })
            .select("id")
            .single();

        if (erroFluxo || !novoFluxo) {
            return { error: erroFluxo?.message ?? "Não foi possível criar o funil" };
        }
        fluxoId = novoFluxo.id;
    } else {
        const { error: erroLimpeza } = await supabase
            .from("etapas")
            .delete()
            .eq("fluxo_id", fluxoId);

        if (erroLimpeza) {
            return { error: erroLimpeza.message };
        }
    }

    const { error: erroEtapas } = await supabase
        .from("etapas")
        .insert(etapas.map((nome, index) => ({ fluxo_id: fluxoId, nome, ordem: index })));

    if (erroEtapas) {
        return { error: erroEtapas.message };
    }
    return { error: null };
}

export async function selecionarPlano({
    corretoraId,
    planoId,
}: {
    corretoraId: string;
    planoId: string;
}) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { data: corretora, error: erroCorretora } = await supabase
        .from("corretoras")
        .select("conta_id")
        .eq("id", corretoraId)
        .single();

    if (erroCorretora || !corretora) {
        return { error: erroCorretora?.message ?? "Corretora não encontrada" };
    }

    const { error } = await supabase
        .from("contas")
        .update({ plano_id: planoId })
        .eq("id", corretora.conta_id);

    if (error) {
        return { error: error.message };
    }
    return { error: null };
}

export async function concluirOnboarding({ corretoraId }: { corretoraId: string }) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { error } = await supabase
        .from("corretoras")
        .update({ onboarding_concluido: true })
        .eq("id", corretoraId);

    if (error) {
        return { error: error.message };
    }
    return { error: null };
}

export async function definirFunilAtivo({
    corretoraId,
    fluxoId,
}: {
    corretoraId: string;
    fluxoId: string;
}) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error: erroDesativar } = await supabase
        .from("fluxos")
        .update({ ativo: false })
        .eq("corretora_id", corretoraId);

    if (erroDesativar) {
        return { error: erroDesativar.message };
    }

    const { error: erroAtivar } = await supabase
        .from("fluxos")
        .update({ ativo: true })
        .eq("id", fluxoId);

    if (erroAtivar) {
        return { error: erroAtivar.message };
    }
    return { error: null };
}

export async function buscarContatos({
    corretoraId,
    query,
}: {
    corretoraId: string;
    query: string;
}) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
        .from("contatos")
        .select("id, nome, telefone, email, cpf_cnpj, tipo_pessoa")
        .eq("corretora_id", corretoraId)
        .ilike("nome", `%${query}%`)
        .order("nome", { ascending: true })
        .limit(8);

    if (error) {
        return { error: error.message, contatos: [] };
    }
    return { error: null, contatos: data ?? [] };
}

export async function criarNegocio({
    corretoraId,
    etapaId,
    contatoId,
    novoContato,
    tipo,
    ramo,
    valor,
    indicacao,
}: {
    corretoraId: string;
    etapaId: string;
    contatoId: string | null;
    novoContato: {
        nome: string;
        email: string | null;
        telefone: string | null;
        cpfCnpj: string | null;
        tipoPessoa: "fisica" | "juridica";
    } | null;
    tipo: string;
    ramo: string;
    valor: number | null;
    indicacao: boolean;
}) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Usuario não encontrado" };
    }

    let contatoIdFinal = contatoId;

    if (!contatoIdFinal && novoContato) {
        const { data: contatoCriado, error: erroContato } = await supabase
            .from("contatos")
            .insert({
                corretora_id: corretoraId,
                nome: novoContato.nome,
                email: novoContato.email,
                telefone: novoContato.telefone,
                cpf_cnpj: novoContato.cpfCnpj,
                tipo_pessoa: novoContato.tipoPessoa,
            })
            .select("id")
            .single();

        if (erroContato || !contatoCriado) {
            return { error: erroContato ? mensagemErroContato(erroContato) : "Não foi possível criar o contato" };
        }
        contatoIdFinal = contatoCriado.id;
    }

    if (!contatoIdFinal) {
        return { error: "Informe um contato" };
    }

    const { error } = await supabase.from("negocios").insert({
        etapa_id: etapaId,
        contato_id: contatoIdFinal,
        vendedor_usuario_id: user.id,
        tipo,
        ramo,
        valor,
        indicacao,
    });

    if (error) {
        return { error: error.message };
    }
    return { error: null };
}

export async function moverNegocio({
    negocioId,
    etapaId,
}: {
    negocioId: string;
    etapaId: string;
}) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Usuario não encontrado" };
    }

    const { data: atual } = await supabase
        .from("negocios")
        .select("etapa_id, tipo, ramo, seguradora, origem, grupo_producao, valor, indicacao, fechado_em")
        .eq("id", negocioId)
        .single();

    const { error } = await supabase
        .from("negocios")
        .update({ etapa_id: etapaId })
        .eq("id", negocioId);

    if (error) {
        return { error: error.message };
    }

    if (atual) {
        const usuarioNome = (user.user_metadata?.nome as string | undefined) ?? user.email ?? "Você";
        await registrarHistoricoNegocio(
            supabase,
            negocioId,
            user.id,
            usuarioNome,
            atual as RegistroNegocioEditavel,
            { ...(atual as RegistroNegocioEditavel), etapa_id: etapaId },
        );
    }

    return { error: null };
}

type RegistroNegocioEditavel = {
    etapa_id: string;
    tipo: string;
    ramo: string;
    seguradora: string | null;
    origem: string | null;
    grupo_producao: string | null;
    valor: number | null;
    indicacao: boolean;
    fechado_em: string | null;
};

const CAMPOS_NEGOCIO_LABELS: Record<keyof RegistroNegocioEditavel, string> = {
    etapa_id: "Etapa",
    tipo: "Tipo de seguro",
    ramo: "Ramo",
    seguradora: "Seguradora",
    origem: "Origem do cliente",
    grupo_producao: "Grupo de produção",
    valor: "Prêmio bruto",
    indicacao: "Cliente é indicação",
    fechado_em: "Data de fechamento",
};

function normalizarCampoNegocio(campo: keyof RegistroNegocioEditavel, valor: unknown) {
    if (valor === null || valor === undefined || valor === "") return null;
    if (campo === "valor") return String(Number(valor));
    if (campo === "indicacao") return valor ? "true" : "false";
    if (campo === "fechado_em") return String(valor).slice(0, 10);
    return String(valor);
}

function formatarValorHistorico(campo: keyof RegistroNegocioEditavel, valor: unknown) {
    if (valor === null || valor === undefined || valor === "") return null;
    if (campo === "valor") return "R$" + Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (campo === "indicacao") return valor ? "Sim" : "Não";
    if (campo === "fechado_em") return String(valor).slice(0, 10);
    return String(valor);
}

async function registrarHistoricoNegocio(
    supabase: ReturnType<typeof createClient>,
    negocioId: string,
    usuarioId: string,
    usuarioNome: string,
    anterior: RegistroNegocioEditavel,
    novo: RegistroNegocioEditavel,
) {
    let nomesEtapa: Record<string, string> = {};
    if (anterior.etapa_id !== novo.etapa_id) {
        const { data } = await supabase
            .from("etapas")
            .select("id, nome")
            .in("id", [anterior.etapa_id, novo.etapa_id]);
        nomesEtapa = Object.fromEntries((data ?? []).map((e) => [e.id as string, e.nome as string]));
    }

    const linhas = (Object.keys(CAMPOS_NEGOCIO_LABELS) as (keyof RegistroNegocioEditavel)[])
        .filter((campo) => normalizarCampoNegocio(campo, anterior[campo]) !== normalizarCampoNegocio(campo, novo[campo]))
        .map((campo) => ({
            negocio_id: negocioId,
            usuario_id: usuarioId,
            usuario_nome: usuarioNome,
            campo: CAMPOS_NEGOCIO_LABELS[campo],
            valor_anterior: campo === "etapa_id" ? (nomesEtapa[anterior.etapa_id] ?? null) : formatarValorHistorico(campo, anterior[campo]),
            valor_novo: campo === "etapa_id" ? (nomesEtapa[novo.etapa_id] ?? null) : formatarValorHistorico(campo, novo[campo]),
        }));

    if (linhas.length) {
        await supabase.from("negocio_historico").insert(linhas);
    }
}

export async function atualizarNegocio({
    negocioId,
    etapaId,
    tipo,
    ramo,
    seguradora,
    origem,
    grupoProducao,
    valor,
    indicacao,
    fechadoEm,
}: {
    negocioId: string;
    etapaId: string;
    tipo: string;
    ramo: string;
    seguradora: string | null;
    origem: string | null;
    grupoProducao: string | null;
    valor: number | null;
    indicacao: boolean;
    fechadoEm: string | null;
}) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Usuario não encontrado" };
    }

    const { data: atual } = await supabase
        .from("negocios")
        .select("etapa_id, tipo, ramo, seguradora, origem, grupo_producao, valor, indicacao, fechado_em")
        .eq("id", negocioId)
        .single();

    const { error } = await supabase
        .from("negocios")
        .update({
            etapa_id: etapaId,
            tipo,
            ramo,
            seguradora,
            origem,
            grupo_producao: grupoProducao,
            valor,
            indicacao,
            fechado_em: fechadoEm,
        })
        .eq("id", negocioId);

    if (error) {
        return { error: error.message };
    }

    if (atual) {
        const usuarioNome = (user.user_metadata?.nome as string | undefined) ?? user.email ?? "Você";
        await registrarHistoricoNegocio(
            supabase,
            negocioId,
            user.id,
            usuarioNome,
            atual as RegistroNegocioEditavel,
            { etapa_id: etapaId, tipo, ramo, seguradora, origem, grupo_producao: grupoProducao, valor, indicacao, fechado_em: fechadoEm },
        );
    }

    return { error: null };
}

export async function atualizarContato({
    contatoId,
    nome,
    email,
    telefone,
    cpfCnpj,
    tipoPessoa,
    profissoes,
}: {
    contatoId: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    cpfCnpj: string | null;
    tipoPessoa: "fisica" | "juridica";
    profissoes: string[];
}) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from("contatos")
        .update({ nome, email, telefone, cpf_cnpj: cpfCnpj, tipo_pessoa: tipoPessoa, profissoes })
        .eq("id", contatoId);

    if (error) {
        return { error: mensagemErroContato(error) };
    }
    return { error: null };
}

export async function deletarNegocio({ negocioId }: { negocioId: string }) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from("negocios")
        .delete()
        .eq("id", negocioId);

    if (error) {
        return { error: error.message };
    }
    return { error: null };
}

export async function listarAnotacoes({ negocioId }: { negocioId: string }) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
        .from("negocio_anotacoes")
        .select("id, texto, usuario_nome, criado_em")
        .eq("negocio_id", negocioId)
        .order("criado_em", { ascending: false });

    if (error) {
        return { error: error.message, anotacoes: [] };
    }
    return { error: null, anotacoes: data ?? [] };
}

export async function criarAnotacao({ negocioId, texto }: { negocioId: string; texto: string }) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Usuario não encontrado" };
    }
    if (!texto.trim()) {
        return { error: "Escreva alguma coisa antes de salvar" };
    }

    const usuarioNome = (user.user_metadata?.nome as string | undefined) ?? user.email ?? "Você";

    const { error } = await supabase.from("negocio_anotacoes").insert({
        negocio_id: negocioId,
        usuario_id: user.id,
        usuario_nome: usuarioNome,
        texto: texto.trim(),
    });

    if (error) {
        return { error: error.message };
    }
    return { error: null };
}

export async function deletarAnotacao({ anotacaoId }: { anotacaoId: string }) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from("negocio_anotacoes")
        .delete()
        .eq("id", anotacaoId);

    if (error) {
        return { error: error.message };
    }
    return { error: null };
}

export async function listarHistorico({ negocioId }: { negocioId: string }) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
        .from("negocio_historico")
        .select("id, campo, valor_anterior, valor_novo, usuario_nome, criado_em")
        .eq("negocio_id", negocioId)
        .order("criado_em", { ascending: false });

    if (error) {
        return { error: error.message, historico: [] };
    }
    return { error: null, historico: data ?? [] };
}

const BUCKET_ANEXOS = "negocio-anexos";
const TAMANHO_MAXIMO_ANEXO = 20 * 1024 * 1024;

export async function listarAnexos({ negocioId }: { negocioId: string }) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
        .from("negocio_anexos")
        .select("id, nome_arquivo, tamanho_bytes, tipo_mime, usuario_nome, criado_em, caminho_storage")
        .eq("negocio_id", negocioId)
        .order("criado_em", { ascending: false });

    if (error) {
        return { error: error.message, anexos: [] };
    }

    const anexosComUrl = await Promise.all(
        (data ?? []).map(async ({ caminho_storage, ...anexo }) => {
            const { data: signed } = await supabase.storage
                .from(BUCKET_ANEXOS)
                .createSignedUrl(caminho_storage as string, 300);
            return { ...anexo, url: signed?.signedUrl ?? null };
        })
    );

    return { error: null, anexos: anexosComUrl };
}

export async function uploadAnexo(formData: FormData) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Usuario não encontrado" };
    }

    const negocioId = formData.get("negocioId");
    const arquivo = formData.get("arquivo");

    if (typeof negocioId !== "string" || !(arquivo instanceof File)) {
        return { error: "Arquivo inválido" };
    }
    if (arquivo.size > TAMANHO_MAXIMO_ANEXO) {
        return { error: "Arquivo maior que 20MB" };
    }

    const caminho = `${negocioId}/${Date.now()}-${arquivo.name}`;

    const { error: erroUpload } = await supabase.storage
        .from(BUCKET_ANEXOS)
        .upload(caminho, arquivo);

    if (erroUpload) {
        return { error: erroUpload.message };
    }

    const usuarioNome = (user.user_metadata?.nome as string | undefined) ?? user.email ?? "Você";

    const { error: erroInsert } = await supabase.from("negocio_anexos").insert({
        negocio_id: negocioId,
        usuario_id: user.id,
        usuario_nome: usuarioNome,
        nome_arquivo: arquivo.name,
        caminho_storage: caminho,
        tamanho_bytes: arquivo.size,
        tipo_mime: arquivo.type || null,
    });

    if (erroInsert) {
        await supabase.storage.from(BUCKET_ANEXOS).remove([caminho]);
        return { error: erroInsert.message };
    }

    return { error: null };
}

export async function deletarAnexo({ anexoId }: { anexoId: string }) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: anexo, error: erroBusca } = await supabase
        .from("negocio_anexos")
        .select("caminho_storage")
        .eq("id", anexoId)
        .single();

    if (erroBusca || !anexo) {
        return { error: erroBusca?.message ?? "Anexo não encontrado" };
    }

    const { error: erroStorage } = await supabase.storage
        .from(BUCKET_ANEXOS)
        .remove([anexo.caminho_storage as string]);

    if (erroStorage) {
        return { error: erroStorage.message };
    }

    const { error: erroDelete } = await supabase
        .from("negocio_anexos")
        .delete()
        .eq("id", anexoId);

    if (erroDelete) {
        return { error: erroDelete.message };
    }
    return { error: null };
}
