import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getMinhasPermissoes } from "@/app/lib/equipe/sessao";
import EquipePage from "./EquipePage";
import type { Cargo, Membro, UsoPlano } from "./tipos";

const ORDEM_CARGOS = ["administrador", "gerente", "financeiro", "operacional", "produtor"];
const ordemCargo = (chave: string | null) => (chave ? ORDEM_CARGOS.indexOf(chave) : ORDEM_CARGOS.length);

export default async function Page({ params, searchParams }: { params: Promise<{ corretoraId: string }>; searchParams: Promise<{ aba?: string }> }) {
    const { corretoraId } = await params;
    const { aba } = await searchParams;
    const permissoes = await getMinhasPermissoes(corretoraId);
    if (!permissoes || !permissoes.permissoes.some((p) => p === "equipe.membros" || p === "equipe.equipes")) redirect(`/corretoras/${corretoraId}/funis`);

    const supabase = await createClient();
    const [{ data: membros }, { data: cargos }, { data: convites }, { data: equipes }, { data: uso }, { data: corretora }] = await Promise.all([
        supabase.from("usuario_corretora").select("usuario_id, ativo, cargo_id, cargo:cargos(nome), usuario:usuarios(nome, email)").eq("corretora_id", corretoraId),
        supabase.from("cargos").select("id, nome, chave, escopo, cargo_permissoes(permissao)").eq("corretora_id", corretoraId).order("criado_em"),
        permissoes.permissoes.includes("equipe.membros")
            ? supabase.from("convites").select("id, email, expira_em, cargo:cargos(nome)").eq("corretora_id", corretoraId).is("aceito_em", null).is("cancelado_em", null).order("criado_em")
            : Promise.resolve({ data: [] }),
        supabase.from("equipes").select("id, nome, ramos, equipe_membros(usuario_id, lider)").eq("corretora_id", corretoraId).order("nome"),
        supabase.rpc("uso_usuarios_conta", { p_corretora_id: corretoraId }).single(),
        supabase.from("corretoras").select("nome, conta:contas(owner_usuario_id)").eq("id", corretoraId).single(),
    ]);

    const dono = (corretora?.conta as unknown as { owner_usuario_id: string } | null)?.owner_usuario_id;
    const agora = new Date().toISOString();

    type LinhaMembro = { usuario_id: string; ativo: boolean; cargo_id: string; cargo: { nome: string } | null; usuario: { nome: string; email: string } | null };
    const lista: Membro[] = ((membros ?? []) as unknown as LinhaMembro[])
        .map((m) => ({ usuarioId: m.usuario_id, nome: m.usuario?.nome ?? "—", email: m.usuario?.email ?? "", cargoId: m.cargo_id, cargoNome: m.cargo?.nome ?? "—", ativo: m.ativo, dono: m.usuario_id === dono }))
        .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));

    type LinhaCargo = { id: string; nome: string; chave: string | null; escopo: Cargo["escopo"]; cargo_permissoes: { permissao: string }[] };
    type LinhaConvite = { id: string; email: string; expira_em: string; cargo: { nome: string } | null };
    type LinhaEquipe = { id: string; nome: string; ramos: string[]; equipe_membros: { usuario_id: string; lider: boolean }[] };

    return (
        <EquipePage
            corretoraId={corretoraId}
            corretoraNome={(corretora?.nome as string) ?? ""}
            membros={lista}
            cargos={((cargos ?? []) as unknown as LinhaCargo[]).map((c) => ({ id: c.id, nome: c.nome, chave: c.chave, escopo: c.escopo, permissoes: c.cargo_permissoes.map((p) => p.permissao) })).sort((a, b) => ordemCargo(a.chave) - ordemCargo(b.chave))}
            convites={((convites ?? []) as unknown as LinhaConvite[]).map((c) => ({ id: c.id, email: c.email, cargoNome: c.cargo?.nome ?? "—", expiraEm: c.expira_em, expirado: c.expira_em <= agora }))}
            equipes={((equipes ?? []) as unknown as LinhaEquipe[]).map((e) => ({ id: e.id, nome: e.nome, ramos: e.ramos, membros: e.equipe_membros.map((m) => ({ usuarioId: m.usuario_id, lider: m.lider })) }))}
            uso={(uso as UsoPlano | null) ?? { usados: 0, limite: 0, plano: "" }}
            abaInicial={aba === "equipes" || aba === "cargos" ? aba : "membros"}
        />
    );
}
