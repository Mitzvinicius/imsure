function normalizar(s: string) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function indiceEtapaRenovacao(nomes: string[]): number {
    return nomes.findIndex((n) => normalizar(n).includes("renova"));
}
