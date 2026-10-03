import type { Etapa, Negocio } from "./types";

export type DetalheNegocio = { negocio: Negocio; etapas: Etapa[] };

/** Resolve o negócio de `?negocio=`: do funil ativo, de outro funil (carregado à parte) ou não encontrado. */
export function negocioDoLink(
    id: string | null,
    negocios: Negocio[],
    etapasAtivo: Etapa[],
    foraDoFunil: DetalheNegocio | null,
): { detalhe: DetalheNegocio | null; naoEncontrado: boolean } {
    if (!id) return { detalhe: null, naoEncontrado: false };
    const doAtivo = negocios.find((n) => n.id === id);
    if (doAtivo) return { detalhe: { negocio: doAtivo, etapas: etapasAtivo }, naoEncontrado: false };
    if (foraDoFunil?.negocio.id === id) return { detalhe: foraDoFunil, naoEncontrado: false };
    return { detalhe: null, naoEncontrado: true };
}
