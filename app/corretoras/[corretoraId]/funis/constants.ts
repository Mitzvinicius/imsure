export const TIPOS = ["Seguro novo", "Renovação com alteração", "Renovação simples", "Endosso"];

export const SEGURADORAS = ["Porto Seguro", "Bradesco Seguros", "SulAmérica", "Allianz", "Tokio Marine", "Mapfre"];

export const ORIGENS = ["Indicação", "Prospecção ativa", "Campanha", "Renovação", "Site", "Redes sociais"];

export const PROFISSOES_OPC = ["Administrador", "Empresário(a)", "Médico(a)", "Advogado(a)", "Engenheiro(a)", "Autônomo(a)", "Servidor(a) público", "Comerciante", "Professor(a)"];

export const GRUPOS_PRODUCAO = ["Produção própria", "Grupo Sul", "Grupo Capital", "Parceria corretora"];

export const formatBRL = (n: number | null | undefined) =>
    "R$" + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function diasDesde(dataIso: string) {
    const dias = Math.floor((Date.now() - new Date(dataIso).getTime()) / 86400000);
    return dias < 0 ? 0 : dias;
}

export function diasLabel(d: number) {
    return d === 0 ? "hoje" : d === 1 ? "1 dia" : `${d} dias`;
}
