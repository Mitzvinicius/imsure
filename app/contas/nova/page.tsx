import { criarConta } from "@/app/lib/actions";

export default function NovaContaPage() {
  return (
    <form action={criarConta}>
      <label>
        Nome da corretora
        <input type="text" name="corretora" required />
      </label>
      <button type="submit">Criar conta</button>
    </form>
  );
}
