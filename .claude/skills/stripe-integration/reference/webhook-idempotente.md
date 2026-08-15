# Idempotência de webhooks Stripe — referência estendida

## Schema da tabela de auditoria (Prisma)

```prisma
model ProcessedEvent {
  id            String   @id @default(cuid())
  stripeEventId String   @unique
  type          String
  processedAt   DateTime @default(now())
}
```

O `@unique` em `stripeEventId` é a segunda linha de defesa: mesmo que a checagem `findUnique` antes da transação passe por uma condição de corrida (dois webhooks chegando quase simultaneamente), a constraint de unicidade no banco rejeita a segunda inserção, e você pode capturar esse erro para tratar como "já processado".

```ts
try {
  await db.$transaction(async (tx) => {
    // lógica de negócio
    await tx.processedEvent.create({ data: { stripeEventId: event.id, type: event.type } });
  });
} catch (err) {
  if (isUniqueConstraintError(err)) {
    return new Response(null, { status: 200 }); // corrida detectada, trata como sucesso
  }
  throw err;
}
```

## Quando o efeito de negócio não pode ficar na transação de banco

Se o efeito envolve uma chamada externa (ex.: disparar um email, chamar outra API), você não pode simplesmente envolver tudo em uma transação de banco — chamadas de rede não são transacionais. Padrão recomendado: **outbox pattern**.

1. Na mesma transação: grava o `ProcessedEvent` **e** uma linha em uma tabela `OutboxJob` descrevendo o efeito pendente (ex.: `{ type: 'send_welcome_email', payload: {...} }`).
2. Um worker separado (cron, queue) lê `OutboxJob` e executa o efeito externo, marcando como concluído.

Isso garante que "eu decidi processar este evento" e "eu vou eventualmente executar o efeito" sejam atômicos, mesmo que o efeito em si só aconteça depois.

## Eventos que costumam exigir tratamento cuidadoso

- `checkout.session.completed` — sessão finalizada, mas confirme `payment_status === 'paid'` antes de liberar acesso (pode haver métodos de pagamento assíncronos).
- `customer.subscription.updated` — dispara em qualquer mudança, incluindo trocas de plano e mudanças de status de trial; compare o payload anterior via `event.data.previous_attributes` se precisar reagir só a mudanças específicas.
- `invoice.payment_failed` — ponto de entrada natural para lógica de dunning (retentativas de cobrança) e comunicação com o cliente.
- `charge.refunded` — se seu domínio precisa reverter acesso ou saldo, trate como evento independente, não como "desfazer" o evento original.
