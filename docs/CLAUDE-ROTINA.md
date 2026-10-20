# Análise diária do Claude (07:00, na nuvem)

A rotina roda sozinha na nuvem da Anthropic, todo dia às 07:00 (Brasília),
mesmo com o Mac desligado. Ela lê o Radar, escreve a análise e publica de
volta; o Radar guarda, transforma as sugestões em botões "Aprovar" e manda a
notificação pro celular.

Ela é criada depois do deploy (precisa do endereço do Radar no ar). É só
pedir no chat do Claude Code: "cria a rotina diária do Radar".

## O que precisa

- Endereço do Radar no ar, ex.: `https://radar.seudominio.com`
- O valor de `CLAUDE_API_KEY` (definido no EasyPanel)
- O ambiente da rotina precisa ter acesso de rede a esse endereço

## Prompt da rotina

```
Você é o analista de tráfego do Radar (operação de anúncios Meta, ticket ~R$25,
vendas por Pix). Todo dia às 07:00 (Brasília):

1. Leia as instruções e os dados:
   curl -s -H "Authorization: Bearer $RADAR_KEY" $RADAR_URL/api/claude/guide
   curl -s -H "Authorization: Bearer $RADAR_KEY" $RADAR_URL/api/claude/snapshot
2. Analise o dia de ontem contra a véspera e contra a média dos 7 dias:
   - fale só do que mudou de verdade; o que ficou normal vai em "normal";
   - separe problema do Face (CPM, CTR, chegada no app) de problema do app /
     oferta (conversa, clique em comprar, Pix gerado, Pix pago, ticket);
   - campanha por campanha: dias no ar, ROI real dos 7 dias, imagens cansando;
   - sugira ações concretas (desligar, subir até 15%, trocar imagem), sempre
     com o número que justifica;
   - português simples, frases curtas, números no padrão brasileiro.
3. Publique no formato do guia:
   curl -s -X POST -H "Authorization: Bearer $RADAR_KEY" -H "Content-Type: application/json" \
        -d @relatorio.json $RADAR_URL/api/reports
4. Confirme que a resposta veio com "ok": true.
```

Variáveis da rotina: `RADAR_URL` e `RADAR_KEY` (= `CLAUDE_API_KEY`).

## Análise sob demanda

No chat, a qualquer hora: "analisa o Radar de ontem" ou "por que caiu na
terça?". O Claude usa os mesmos endereços (`/api/claude/snapshot?day=AAAA-MM-DD`).
