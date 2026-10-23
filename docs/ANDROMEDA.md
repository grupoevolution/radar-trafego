# O que o Andrômeda precisa receber

O Radar manda **só o gasto total do dia** (todas as campanhas de todas as
contas somadas). Nada de campanha, conta ou métrica.

## Quando

- A cada 30 minutos (configurável), com o total do dia **até aquele momento**.
- 00:05: fechamento do dia anterior (`"fechado": true`).
- 04:00: o mesmo fechamento de novo, já com o número final do Face.

## Como

```
POST https://<endereço do Andrômeda>/api/argos/gasto
Content-Type: application/json
X-Radar-Secret: <senha combinada>

{
  "dia": "2026-10-19",
  "gasto_total": 2410.22,
  "atualizado_em": "2026-10-19T21:30:00-03:00",
  "fechado": false
}
```

## O que o Andrômeda deve fazer

1. Conferir o cabeçalho `X-Radar-Secret` (se errado → responder 401).
2. **Gravar o valor do dia substituindo o anterior** (nunca somar).
   Ex.: às 21:00 chegou 2.297,80 e às 21:30 chegou 2.410,22 → o dia fica 2.410,22.
   Assim, se um envio falhar ou chegar duas vezes, o número continua certo.
3. Responder `200` (qualquer corpo).

No Radar: **Conexões → Andrômeda** → endereço + senha → Ligado → Salvar →
"Enviar agora" pra testar. A lista abaixo mostra cada envio e se deu certo.


## Pronto (23/10/2026)

O Andrômeda já tem a rota (v5.12.0). No EasyPanel do Andrômeda crie a variável
`ARGOS_SECRET` (um texto qualquer, longo). No Argos → Conexões → Andrômeda:
endereço `https://<andromeda>/api/argos/gasto`, a mesma senha, ligado.
Editar o gasto à mão no Andrômeda continua valendo: se o dia foi mexido à mão,
o Argos não sobrescreve; apagar o dia (0) devolve pro automático.
