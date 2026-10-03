export function calcularImc(pesoKg: number | null, alturaM: number | null): number | null {
    if (!pesoKg || !alturaM) return null;
    return Math.round((pesoKg / (alturaM * alturaM)) * 10) / 10;
}

// Faixas da OMS para adultos.
export function classificarImc(imc: number): string {
    if (imc < 18.5) return "Abaixo do peso";
    if (imc < 25) return "Peso normal";
    if (imc < 30) return "Sobrepeso";
    if (imc < 35) return "Obesidade grau I";
    if (imc < 40) return "Obesidade grau II";
    return "Obesidade grau III";
}
