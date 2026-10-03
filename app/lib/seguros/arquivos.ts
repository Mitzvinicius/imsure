// O Supabase Storage recusa chaves com acento/espaço ("Invalid key"); o nome original fica em nome_arquivo.
export function nomeSeguroParaStorage(nome: string): string {
    const limpo = nome
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\w.-]+/g, "_")
        .replace(/^_+|_+$/g, "");
    return /^[._-]*$/.test(limpo) ? "arquivo" : limpo;
}
