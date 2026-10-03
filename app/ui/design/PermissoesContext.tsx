'use client';
import { createContext, useContext, useMemo } from "react";
import type { MinhasPermissoes } from "@/app/lib/equipe/sessao";
import type { Permissao } from "@/app/lib/equipe/permissoes";

type Valor = MinhasPermissoes & { usuarioId: string; pode: (p: Permissao) => boolean };

const Ctx = createContext<Valor | null>(null);

export function PermissoesProvider({ valor, usuarioId, children }: { valor: MinhasPermissoes; usuarioId: string; children: React.ReactNode }) {
    const memo = useMemo<Valor>(() => ({ ...valor, usuarioId, pode: (p) => valor.permissoes.includes(p) }), [valor, usuarioId]);
    return <Ctx.Provider value={memo}>{children}</Ctx.Provider>;
}

export function usePermissoes(): Valor {
    const v = useContext(Ctx);
    if (!v) throw new Error("usePermissoes fora de PermissoesProvider");
    return v;
}
