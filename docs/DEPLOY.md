# Subir o Radar no EasyPanel

São 4 passos. O app de membros não muda em nada.

## 1. Banco próprio do Radar

No EasyPanel, no mesmo projeto: **+ Service → Postgres**. Nome: `radar-db`.
Copie a "Internal Connection URL" (vai em `DATABASE_URL`).

## 2. Usuário SÓ LEITURA no banco do app de membros

Abra o terminal (Console) do Postgres do **app de membros** no EasyPanel e rode
(troque a senha e o nome do banco se for diferente):

```sql
CREATE ROLE radar_leitura LOGIN PASSWORD 'troque-esta-senha';
GRANT CONNECT ON DATABASE areamembros TO radar_leitura;
GRANT USAGE ON SCHEMA public TO radar_leitura;
GRANT SELECT ON tracking_events, chat_messages, chat_sessions, checkout_intents,
  pix_pending_notices, user_access, ad_attributions TO radar_leitura;
ALTER ROLE radar_leitura SET default_transaction_read_only = on;
ALTER ROLE radar_leitura SET statement_timeout = '15s';
```

Esse usuário só enxerga as 7 tabelas que o Radar usa e não consegue escrever
nada. `APP_DATABASE_URL` fica assim (host interno do Postgres do app):

```
postgres://radar_leitura:troque-esta-senha@<host-do-postgres-do-app>:5432/areamembros
```

## 3. App do Radar

**+ Service → App**, fonte: o repositório do GitHub do Radar, branch `main`.
Build: Nixpacks (detecta Node sozinho). Porta: **3200**.

Variáveis (aba Environment) — veja `.env.example`:

| Variável | Valor |
|---|---|
| `PORT` | 3200 |
| `DATABASE_URL` | URL do `radar-db` |
| `APP_DATABASE_URL` | URL do usuário `radar_leitura` |
| `ADMIN_PASSWORD` | senha do painel |
| `SECRET_KEY` | texto longo aleatório (nunca troque depois) |
| `CLAUDE_API_KEY` | outro texto longo aleatório (a rotina do Claude usa) |
| `META_API_VERSION` | v24.0 |
| `DEMO_MODE` | 1 pra conhecer; 0 pra usar de verdade |

Domínio: em Domains, aponte um subdomínio (ex.: `radar.seudominio.com`) com HTTPS.
O Radar não tem a trava anti-desktop (é privado, com senha) e não aparece em
nenhum anúncio.

## 4. Primeiro acesso

1. Abra o endereço, entre com a senha.
2. Se estiver com `DEMO_MODE=1`, navegue à vontade. Pra usar de verdade:
   troque pra `0`, reinicie, entre em **Conexões → Apagar demonstração**.
3. **Conexões → Conectar BM** (ver [FACEBOOK.md](FACEBOOK.md)).
4. Cole a **etiqueta** nos anúncios (Conexões mostra o texto pronto).
5. No celular: abra o endereço, adicione à Tela de Início e toque em
   **Ativar notificações**.

## Saúde

- `GET /health` → `{ ok, db }`
- Conexões → "Últimas leituras" mostra cada leitura do Face/app e os erros.
