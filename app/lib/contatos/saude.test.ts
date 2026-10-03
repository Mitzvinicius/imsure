import { describe, expect, it } from "vitest";
import { calcularImc, classificarImc } from "./saude";

describe("calcularImc", () => {
    it("peso / altura², uma casa decimal", () => {
        expect(calcularImc(70, 1.75)).toBe(22.9);
        expect(calcularImc(95, 1.8)).toBe(29.3);
    });
    it("sem peso ou altura não calcula", () => {
        expect(calcularImc(null, 1.75)).toBeNull();
        expect(calcularImc(70, null)).toBeNull();
        expect(calcularImc(70, 0)).toBeNull();
    });
});

describe("classificarImc", () => {
    it("faixas da OMS", () => {
        expect(classificarImc(17)).toBe("Abaixo do peso");
        expect(classificarImc(18.5)).toBe("Peso normal");
        expect(classificarImc(24.9)).toBe("Peso normal");
        expect(classificarImc(25)).toBe("Sobrepeso");
        expect(classificarImc(30)).toBe("Obesidade grau I");
        expect(classificarImc(35)).toBe("Obesidade grau II");
        expect(classificarImc(40)).toBe("Obesidade grau III");
    });
});
