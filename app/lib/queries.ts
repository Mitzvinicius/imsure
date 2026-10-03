import { createClient } from "@/utils/supabase/server";

export type CorretoraDoUsuario = {
    corretoraId: string;
    corretoraNome: string;
    contaId: string;
    contaNome: string;
    cargo: string;
    souDono: boolean;
    onboardingConcluido: boolean;
};

export async function getCorretorasDoUsuario(): Promise<CorretoraDoUsuario[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
        .from("usuario_corretora")
        .select("cargo:cargos(nome), corretora:corretoras(id, nome, onboarding_concluido, conta:contas(id, nome, owner_usuario_id))")
        .eq("usuario_id", user.id)
        .eq("ativo", true);

    type Linha = {
        cargo: { nome: string } | null;
        corretora: { id: string; nome: string; onboarding_concluido: boolean; conta: { id: string; nome: string; owner_usuario_id: string } | null } | null;
    };
    return ((data ?? []) as unknown as Linha[])
        .filter((l) => l.corretora?.conta)
        .map((l) => ({
            corretoraId: l.corretora!.id,
            corretoraNome: l.corretora!.nome,
            contaId: l.corretora!.conta!.id,
            contaNome: l.corretora!.conta!.nome,
            cargo: l.cargo?.nome ?? "—",
            souDono: l.corretora!.conta!.owner_usuario_id === user.id,
            onboardingConcluido: l.corretora!.onboarding_concluido,
        }))
        .sort((a, b) => a.contaNome.localeCompare(b.contaNome) || a.corretoraNome.localeCompare(b.corretoraNome));
}
