'use client';
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import { parseValorBR } from "@/app/lib/seguros/datas";
import type { BemAutoForm, BemResidencialForm, BemRcForm, BemSeguradoForm } from "@/app/lib/seguros/types";
import VidasFields from "./VidasFields";

export const AUTO_VAZIO: BemAutoForm = { placa: "", chassi: "", marca: "", modelo: "", ano_fabricacao: null, ano_modelo: null, cep_pernoite: "" };
export const RESIDENCIAL_VAZIO: BemResidencialForm = { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", tipo_imovel: "casa" };
export const RC_VAZIO: BemRcForm = { atividade: "", limite: null };

const ano = (s: string) => (s ? Number(s.replace(/\D/g, "").slice(0, 4)) || null : null);

export default function BemSeguradoFields({ bem, onChange }: { bem: BemSeguradoForm; onChange: (b: BemSeguradoForm) => void }) {
    if (bem.tipo === "livre") {
        return <TextField label="Descrição do bem segurado" multiline minRows={2} value={bem.descricao} onChange={(e) => onChange({ tipo: "livre", descricao: e.target.value })} fullWidth />;
    }
    if (bem.tipo === "vida") {
        return <VidasFields itens={bem.itens} onChange={(itens) => onChange({ tipo: "vida", itens })} />;
    }
    if (bem.tipo === "auto") {
        const v = bem.itens[0] ?? AUTO_VAZIO;
        const set = (p: Partial<BemAutoForm>) => onChange({ tipo: "auto", itens: [{ ...v, ...p }] });
        return (
            <Stack spacing={1.5}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField label="Placa" value={v.placa} onChange={(e) => set({ placa: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7) })} sx={{ flex: 1 }} />
                    <TextField label="Chassi" value={v.chassi} onChange={(e) => set({ chassi: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17) })} sx={{ flex: 2 }} />
                    <TextField label="CEP de pernoite" value={v.cep_pernoite} onChange={(e) => set({ cep_pernoite: e.target.value.replace(/\D/g, "").slice(0, 8) })} sx={{ flex: 1 }} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField label="Marca" value={v.marca} onChange={(e) => set({ marca: e.target.value })} sx={{ flex: 1 }} />
                    <TextField label="Modelo" value={v.modelo} onChange={(e) => set({ modelo: e.target.value })} sx={{ flex: 2 }} />
                    <TextField label="Ano fabricação" value={v.ano_fabricacao ?? ""} onChange={(e) => set({ ano_fabricacao: ano(e.target.value) })} sx={{ flex: 1 }} />
                    <TextField label="Ano modelo" value={v.ano_modelo ?? ""} onChange={(e) => set({ ano_modelo: ano(e.target.value) })} sx={{ flex: 1 }} />
                </Stack>
            </Stack>
        );
    }
    if (bem.tipo === "residencial") {
        const v = bem.itens[0] ?? RESIDENCIAL_VAZIO;
        const set = (p: Partial<BemResidencialForm>) => onChange({ tipo: "residencial", itens: [{ ...v, ...p }] });
        return (
            <Stack spacing={1.5}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField label="CEP" value={v.cep} onChange={(e) => set({ cep: e.target.value.replace(/\D/g, "").slice(0, 8) })} sx={{ flex: 1 }} />
                    <TextField label="Logradouro" value={v.logradouro} onChange={(e) => set({ logradouro: e.target.value })} sx={{ flex: 3 }} />
                    <TextField label="Número" value={v.numero} onChange={(e) => set({ numero: e.target.value })} sx={{ flex: 1 }} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField label="Complemento" value={v.complemento} onChange={(e) => set({ complemento: e.target.value })} sx={{ flex: 1 }} />
                    <TextField label="Bairro" value={v.bairro} onChange={(e) => set({ bairro: e.target.value })} sx={{ flex: 1 }} />
                    <TextField label="Cidade" value={v.cidade} onChange={(e) => set({ cidade: e.target.value })} sx={{ flex: 1 }} />
                    <TextField label="UF" value={v.uf} onChange={(e) => set({ uf: e.target.value.toUpperCase().slice(0, 2) })} sx={{ width: 80 }} />
                    <TextField select label="Tipo de imóvel" value={v.tipo_imovel} onChange={(e) => set({ tipo_imovel: e.target.value as BemResidencialForm["tipo_imovel"] })} sx={{ flex: 1 }}>
                        <MenuItem value="casa">Casa</MenuItem>
                        <MenuItem value="apartamento">Apartamento</MenuItem>
                        <MenuItem value="condominio">Condomínio</MenuItem>
                        <MenuItem value="outro">Outro</MenuItem>
                    </TextField>
                </Stack>
            </Stack>
        );
    }
    const v = bem.itens[0] ?? RC_VAZIO;
    const set = (p: Partial<BemRcForm>) => onChange({ tipo: "rc", itens: [{ ...v, ...p }] });
    return (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField label="Atividade coberta" required value={v.atividade} onChange={(e) => set({ atividade: e.target.value })} sx={{ flex: 2 }} />
            <TextField label="Limite (R$)" value={v.limite != null ? String(v.limite).replace(".", ",") : ""} onChange={(e) => set({ limite: parseValorBR(e.target.value) })} sx={{ flex: 1 }} />
        </Stack>
    );
}
