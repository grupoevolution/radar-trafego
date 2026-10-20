# Radar — painel de tráfego (Meta)

Sistema separado do app de membros. Lê todas as BMs do Facebook, cruza com as
vendas reais do app (Kirvano) e mostra o resultado de verdade: ROI real por
dia, por campanha e por anúncio, o funil do anúncio até o Pix pago, criativos
cansando, teto de escala, organização das contas (contingência), regras com
aprovação e a análise diária escrita pelo Claude.

## O que tem dentro

| Aba | Pra quê |
|---|---|
| Visão geral | O dia ao vivo: gasto, faturamento real, ROI real × ROI do Face, lucro no bolso, funil com números e %, gasto × faturamento por hora, alertas, contas |
| O que mudou | Compara dois dias elo por elo (CPM, CTR, chegada, conversão, ticket) e diz qual elo derrubou o resultado. ROI de 14 dias com o diário de mudanças |
| Campanhas | Face × real lado a lado, há quantos dias no ar, sinal (escalar, manter, cansando, desligar). Liga/desliga e orçamento (com a edição liberada) |
| Criativos | Campeões, cansados (frequência + CTR caindo), padrões: nº de imagens por campanha, modelo, vida útil |
| Escala | Gasto do dia × ROI real (60 dias), faixa ideal de orçamento, custo por venda pelo tamanho da campanha, ROI com recompra (7 e 30 dias) |
| Contas e perfis | Perfil cofre → perfis → BMs → contas, cartão, limite, % do gasto, reservas, domínios, "uma conta caiu" com sugestão de redistribuição |
| Regras | Regras pelo ROI real com modo só avisar / pedir aprovação / automático, fila de aprovação e histórico com Desfazer |
| Relatórios | A análise do Claude (07:00) com gráficos e sugestões que viram botão Aprovar + números do dia automáticos |
| Conexões | Conectar BM, app, Andrômeda, notificações, metas, travas da edição, últimas leituras |

No celular abre uma versão simples: Hoje, Aprovar, Alertas, Análise.

## Como roda

- Node 18+ / Express / Postgres próprio (não usa o banco do app pra gravar nada).
- Lê o app de membros por uma conexão **só leitura** (no máximo 2 conexões,
  toda consulta em transação READ ONLY com limite de 15 s).
- A cada 30 min lê o Face + o app; 00:05 fecha o dia anterior; 04:00 confere de novo.
- `DEMO_MODE=1` mostra tudo com dados simulados (pra conhecer antes de conectar).

Rodar local:

```bash
cp .env.example .env   # e preencha
npm install
npm start              # http://localhost:3200
```

Guias:
- [docs/DEPLOY.md](docs/DEPLOY.md) — subir no EasyPanel
- [docs/FACEBOOK.md](docs/FACEBOOK.md) — conectar as BMs e a etiqueta dos anúncios
- [docs/ANDROMEDA.md](docs/ANDROMEDA.md) — o que o Andrômeda precisa receber
- [docs/CLAUDE-ROTINA.md](docs/CLAUDE-ROTINA.md) — a análise diária das 07:00
