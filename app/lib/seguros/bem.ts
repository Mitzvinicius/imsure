import { tipoBemDoRamo } from "./ramos";
import type { BemAutoForm, BemRcForm, BemResidencialForm, BemSeguradoForm } from "./types";

export const AUTO_VAZIO: BemAutoForm = { placa: "", chassi: "", marca: "", modelo: "", ano_fabricacao: null, ano_modelo: null, cep_pernoite: "" };
export const RESIDENCIAL_VAZIO: BemResidencialForm = { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", tipo_imovel: "casa" };
export const RC_VAZIO: BemRcForm = { atividade: "", limite: null };

export function bemVazioParaRamo(ramo: string): BemSeguradoForm {
    switch (tipoBemDoRamo(ramo)) {
        case "auto": return { tipo: "auto", itens: [AUTO_VAZIO] };
        case "residencial": return { tipo: "residencial", itens: [RESIDENCIAL_VAZIO] };
        case "rc": return { tipo: "rc", itens: [RC_VAZIO] };
        case "vida": return { tipo: "vida", itens: [] };
        default: return { tipo: "livre", descricao: "" };
    }
}
