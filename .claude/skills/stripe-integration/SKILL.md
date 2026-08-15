---
name: stripe-integration
description: Integração de pagamentos com Stripe — validação de assinatura de webhooks com STRIPE_WEBHOOK_SECRET, idempotência via tabela de auditoria de eventos processados, e tratamento correto do raw body em Route Handlers do Next.js. Use SEMPRE que estiver criando checkout, assinaturas, webhooks de pagamento, ou qualquer endpoint que receba eventos do Stripe, mesmo que o usuário só peça "integra o Stripe" sem detalhar o webhook.
---

# Stripe: Webhooks Idempotentes e Seguros

## As três regras não-negociáveis

1. **Sempre valide a assinatura do webhook** com `stripe.webhooks.constructEvent()` usando `STRIPE_WEBHOOK_SECRET`. Nunca confie em um payload de webhook sem essa validação — qualquer um pode enviar um POST forjado para o endpoint.
2. **A validação de assinatura exige o corpo bruto (raw body) da requisição**, não o JSON já parseado. Se o framework/middleware transformar o body antes de chegar no handler, a verificação falha.
3. **Todo handler de webhook precisa ser idempotente.** O Stripe pode reenviar o mesmo evento múltiplas vezes (retries automáticos por até 72h, ou reenvio manual pelo dashboard). Processar o mesmo evento duas vezes não pode duplicar efeito (ex.: liberar acesso duas vezes, enviar email duas vezes).

## Route Handler correto (raw body preservado)

```ts
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { stripe } from '@/shared/api/stripe-client';
import { db } from '@/shared/api/db';

export async function POST(req: Request) {
  const rawBody = await req.text(); // NUNCA use req.json() aqui
  const signature = (await headers()).get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Assinatura inválida', { status: 400 });
  }

  // Idempotência: verifica e registra na MESMA transação que o trabalho de negócio
  const alreadyProcessed = await db.processedEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (alreadyProcessed) {
    return new Response(null, { status: 200 }); // já processado, responde 200 mesmo assim
  }

  await db.$transaction(async (tx) => {
    switch (event.type) {
      case 'checkout.session.completed':
        // ... lógica de negócio ...
        break;
      // outros event.type relevantes ao seu domínio
    }
    await tx.processedEvent.create({ data: { stripeEventId: event.id, type: event.type } });
  });

  return new Response(null, { status: 200 });
}
```

## Por que a transação importa

Registrar o evento como "processado" **fora** da mesma transação do efeito de negócio cria uma janela de inconsistência: se o processo cair entre executar o efeito e gravar o registro de idempotência, o próximo retry do Stripe vai reprocessar e duplicar o efeito. Sempre envolva ambos na mesma transação de banco — veja `reference/webhook-idempotente.md` para o schema da tabela de auditoria e variações (ex.: quando o efeito de negócio não pode ficar na mesma transação por envolver uma chamada externa).

## Checklist ao implementar um novo tipo de evento

1. O endpoint está registrado no dashboard do Stripe apontando para a URL correta?
2. `STRIPE_WEBHOOK_SECRET` está nas variáveis de ambiente do ambiente correto (test vs live têm segredos diferentes)?
3. O handler responde `200` rapidamente, mesmo que o processamento pesado seja assíncrono (evita timeout e retry desnecessário do Stripe)?
4. Existe uma linha em `processedEvent` (ou equivalente) sendo gravada dentro da mesma transação do efeito?
5. Erros inesperados retornam status `!= 2xx` para que o Stripe re-tente automaticamente?
