const MENSAGENS_UNICIDADE: Record<string, string> = {
    apolices_seguradora_numero_key: "Já existe uma apólice com esse número nessa seguradora.",
    apolices_negocio_origem_key: "Esse negócio já tem uma apólice emitida.",
    apolices_apolice_anterior_key: "Essa apólice já foi renovada.",
    parcelas_apolice_numero_key: "Já existe uma parcela com esse número.",
    parcelas_endosso_numero_key: "Já existe uma parcela com esse número nesse endosso.",
    endossos_apolice_numero_key: "Já existe um endosso com esse número nessa apólice.",
};

export function mensagemErroSeguros(error: { code?: string; message: string }): string {
    if (error.code === "23505") {
        const chave = Object.keys(MENSAGENS_UNICIDADE).find((k) => error.message.includes(k));
        if (chave) return MENSAGENS_UNICIDADE[chave];
    }
    if (error.code === "23514" && error.message.includes("apolices_vigencia_check")) {
        return "O fim da vigência precisa ser depois do início.";
    }
    if (error.code === "42501") {
        return "Você não tem permissão para alterar esse registro.";
    }
    return error.message;
}
