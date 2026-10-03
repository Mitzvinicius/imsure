# Módulo de Tarefas (parte B) — tarefas, conversa interna e notificações

> Status: aprovado em conversa, aguardando revisão do documento · 2026-10-03
> Depende da parte A (`2026-10-03-equipe-design.md`): usuários por corretora, cargos e funções de visibilidade.

## Contexto e objetivo

O Mitz pediu "um mecanismo de controle de tarefas/emissão/sinistros tipo um Slack" para os times se organizarem. A decisão foi **tarefas ligadas aos registros**, com **conversa interna e @menções** dentro de cada negócio, apólice, sinistro e contato — em vez de chat solto em canais, para que o combinado fique registrado onde importa.

**Sucesso**: qualquer membro cria tarefa com responsável, prazo e prioridade, ligada (ou não) a um registro; cada pessoa vê o que tem para fazer em "Minhas tarefas"; a conversa sobre um sinistro fica no próprio sinistro; quem é mencionado ou recebe tarefa é avisado pelo sino, em tempo real.

## Decisões tomadas (e por quê)

| Decisão | Motivo |
|---|---|
| Tarefas ligadas a registros + comentários com @menção (não canais, não quadro separado) | Conversa no contexto certo e registrada; canais concorrem com o WhatsApp; o funil já é um quadro |
| Notificações **só dentro do imsure** por enquanto (sino + "Minhas tarefas") | Rápido, sem serviço externo; cada notificação é um registro, então e-mail vira só mais um canal depois |
| Anotações atuais do negócio (`negocio_anotacoes`) **migram para comentários** | Evita dois conceitos iguais; autor e data preservados |
| Visibilidade herda as regras da parte A | Ninguém vê tarefa/conversa de registro que não pode abrir |
| @menção e responsável só sugerem (e o banco só aceita) quem pode ver o registro | Ninguém é chamado para algo que não consegue abrir |
| Lembretes de prazo diários às 7h via `pg_cron` | Mesmo mecanismo da renovação automática |

## Modelo de dados

- **`tarefas`**: `id`, `corretora_id`, `titulo text not null`, `descricao`, `responsavel_usuario_id`, `criado_por`, `prazo date null`, `prazo_hora time null`, `prioridade text check in ('baixa','media','alta') default 'media'`, `status text check in ('a_fazer','em_andamento','concluida','cancelada') default 'a_fazer'`, `concluida_em`, `negocio_id | apolice_id | sinistro_id | contato_id` (no máximo um preenchido — check), `criado_em`, `atualizado_em`.
- **`comentarios`**: `id`, `corretora_id`, `autor_usuario_id`, `texto text not null`, `negocio_id | apolice_id | sinistro_id | contato_id | tarefa_id` (exatamente um — check), `criado_em`, `editado_em`.
- **`comentario_mencoes`**: `comentario_id`, `usuario_id`; pk composta.
- **`notificacoes`**: `id`, `usuario_id`, `corretora_id`, `tipo text check in ('tarefa_atribuida','mencao','comentario_tarefa','prazo_hoje','tarefa_atrasada','tarefa_concluida')`, `titulo`, `texto`, `link text` (rota interna), `lida_em`, `criado_em`; índice `(usuario_id, lida_em)`.

Migração: `negocio_anotacoes` → `comentarios` (com `negocio_id`, autor, texto, data); a tabela antiga deixa de ser usada pelas telas (remoção em migração posterior).

## Regras de acesso (RLS)

- **Tarefa**: membro da corretora **e** (responsável = uid **ou** criado_por = uid **ou** consegue ver o registro vinculado — `usuario_ve_responsavel` do negócio / `usuario_possui_apolice` / sinistro via apólice / `usuario_ve_contato` **ou**, para tarefa avulsa, escopo `tudo` / líder do responsável). Editar: responsável, criador ou escopo `tudo`.
- **Atribuição**: tarefa ligada a um registro só pode ter como responsável quem consegue ver esse registro (mesma função das menções); o autocomplete de responsável só lista essas pessoas.
- **Comentário**: quem vê o registro (ou a tarefa). Editar/excluir: só o autor.
- **Menção**: insert permitido só se o mencionado é membro ativo e consegue ver o registro (função `usuario_alvo_ve_registro(usuario_id, ...)`).
- **Notificação**: só o próprio `usuario_id` lê e marca como lida; insert apenas por triggers/funções `security definer`.

## Notificações (geradas no banco)

| Evento | Quem recebe |
|---|---|
| Tarefa criada ou reatribuída | Novo responsável (se ≠ quem fez) |
| @menção em comentário | Mencionados |
| Comentário em tarefa | Responsável e criador da tarefa (exceto o autor) |
| Tarefa concluída | Criador (se ≠ quem concluiu) |
| 7h diário: prazo hoje / atrasada (status aberto) | Responsável (uma notificação por tarefa por dia, idempotente) |

Tempo real: Supabase Realtime na tabela `notificacoes` (RLS garante que cada um só recebe as suas) para atualizar o contador do sino sem recarregar.

## Telas

1. **Sino** no menu lateral: contador de não lidas (tempo real), lista das últimas 20, clique marca como lida e navega ao `link`, "Marcar todas como lidas".
2. **`/corretoras/[id]/tarefas`** (menu "Tarefas"): grupos **Atrasadas · Hoje · Próximos 7 dias · Depois · Sem prazo**; filtros **Minhas · Criadas por mim · Equipe** (líder) **· Todas** (escopo tudo), prioridade e tipo de registro; concluir com um clique (checkbox); **Nova tarefa** (avulsa ou escolhendo o registro).
3. **Painel "Tarefas e conversa"** em negócio (substitui a aba Anotações do `DealActivityPanel`), apólice (aba nova), sinistro (seção nova) e contato (aba nova "Atividades"): tarefas do registro (criar já vinculada) + conversa com @menções (autocomplete só de quem vê o registro).
4. **Tarefa aberta** (diálogo): campos editáveis, link para o registro, comentários da tarefa.

## Erros e casos de borda
- Responsável desativado: tarefas continuam visíveis com o nome; filtro "Sem responsável ativo" para o admin reatribuir.
- Registro excluído: tarefas e comentários vinculados são excluídos junto (cascade); notificações antigas apontam para link que mostra "não encontrado".
- Prazo no passado ao criar: permitido (já nasce atrasada), com aviso.
- Fuso: "hoje" e o job das 7h em `America/Sao_Paulo`.

## Verificação
- **SQL** `supabase/tests/tarefas_rls.sql`: produtor não vê tarefa ligada a apólice de colega; atribuir tarefa de um registro a quem não vê esse registro é recusado; menção a quem não vê é recusada; notificação de outra pessoa invisível; job das 7h idempotente.
- **Vitest**: agrupamento por prazo (atrasada/hoje/7 dias/depois/sem prazo, fuso SP), extração de @menções do texto, ordenação por prioridade.
- **Navegador**: criar tarefa num sinistro atribuída a outro membro → sino dele acende em tempo real; @menção; concluir; migração das anotações aparecendo como comentários.

## Fora de escopo
E-mail/WhatsApp, tarefas recorrentes, tarefas automáticas por evento, anexos em comentários, canais gerais, reações/emojis.
