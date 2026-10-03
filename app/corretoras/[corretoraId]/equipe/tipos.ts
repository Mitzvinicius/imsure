export type Membro = { usuarioId: string; nome: string; email: string; cargoId: string; cargoNome: string; ativo: boolean; dono: boolean };
export type Cargo = { id: string; nome: string; chave: string | null; escopo: "tudo" | "equipe" | "propria"; permissoes: string[] };
export type ConvitePendente = { id: string; email: string; cargoNome: string; expiraEm: string; expirado: boolean };
export type Equipe = { id: string; nome: string; ramos: string[]; membros: { usuarioId: string; lider: boolean }[] };
export type UsoPlano = { usados: number; limite: number; plano: string };
