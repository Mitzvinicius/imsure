import { describe, expect, it } from "vitest";
import { calcularStatusApolice } from "./status";

const base = { canceladaEm: null, fimVigencia: "2026-12-31", foiRenovada: false, hoje: "2026-10-02" };

describe("calcularStatusApolice", () => {
    it("vigente antes do fim", () => {
        expect(calcularStatusApolice(base)).toBe("vigente");
    });
    it("o último dia ainda é vigente", () => {
        expect(calcularStatusApolice({ ...base, hoje: "2026-12-31" })).toBe("vigente");
    });
    it("vencida depois do fim", () => {
        expect(calcularStatusApolice({ ...base, hoje: "2027-01-01" })).toBe("vencida");
    });
    it("renovada tem prioridade sobre vencida", () => {
        expect(calcularStatusApolice({ ...base, hoje: "2027-01-01", foiRenovada: true })).toBe("renovada");
    });
    it("cancelada tem prioridade sobre tudo", () => {
        expect(calcularStatusApolice({ ...base, foiRenovada: true, canceladaEm: "2026-05-01" })).toBe("cancelada");
    });
});
