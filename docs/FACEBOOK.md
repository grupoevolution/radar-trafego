# Conectar as BMs

## Uma vez só: o app do Facebook

1. Entre em **developers.facebook.com** com o **perfil cofre** → Meus apps →
   Criar app → tipo **Empresa** → nome "Radar" → vincule à BM principal.
2. No app, adicione o produto **API de Marketing** (Marketing API).
3. Em cada uma das outras BMs: Configurações do negócio → Contas → **Apps** →
   Adicionar → "Conectar um ID do app" → cole o ID do app Radar.

O app pode ficar no modo desenvolvimento: ele só lê as contas das suas BMs.

## Em cada BM: a chave

1. Configurações do negócio → Usuários → **Usuários do sistema** → Adicionar
   (nome "radar", função **Admin**).
2. No usuário: **Atribuir ativos** → Contas de anúncios → marque todas as
   contas dessa BM → **Controle total**.
3. **Gerar novo token** → app Radar → validade **Nunca** → permissões:
   - `ads_read` (ler) e `business_management`
   - `ads_management` só quando for liberar a edição (etapa 4)
4. Copie a chave → Radar → **Conexões → Conectar BM** → cole → Conectar.

O Radar descobre sozinho as contas e o nome da BM. Depois, em **Contas e
perfis**, toque na BM e escolha o perfil que administra.

Se um perfil cair, a chave continua valendo enquanto a BM existir. Se a BM
cair, o Radar avisa no celular e o histórico dela fica guardado.

## A etiqueta dos anúncios (obrigatória pro ROI real por campanha)

Em cada anúncio → Rastreamento → **Parâmetros de URL**, cole:

```
utm_source=fb&utm_campaign={{campaign.id}}&utm_medium={{adset.id}}&utm_content={{ad.id}}&utm_term={{placement}}
```

O app de membros já guarda essas etiquetas quando o lead entra. Quando a
venda cai, o Radar liga a venda ao anúncio que trouxe aquela pessoa.
Campanhas antigas com o nome no lugar do ID (`{{campaign.name}}`) também
funcionam.

Dica pros relatórios: mantenha o padrão de nome `ABO-3CRI-IMG-RAQUEL`
(tipo, nº de imagens, formato, modelo). O Radar agrupa por esses pedaços.
