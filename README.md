# Bot de Afiliados — Mercado Livre & Shopee

Automação de busca de ofertas de produtos para casa, geração de imagem/copy via IA e envio no WhatsApp. Arquitetura completa em [`docs/arquitetura.md`](docs/arquitetura.md).

## Status

**Fase 1 em andamento** — busca de ofertas no Mercado Livre + filtro por desconto/nota, testável via CLI. Conversão de link de afiliado está com a estrutura pronta, mas depende dos parâmetros reais do seu painel de afiliados do Mercado Livre (veja `backend/.env.example`).

## Rodando a Fase 1

```bash
cd backend
npm install
cp .env.example .env   # ajuste os critérios se quiser
npm run dev
```

Isso busca ofertas, filtra pelos critérios configurados e imprime os links (ainda sem o parâmetro de afiliado, até você preencher o `.env`).

## Próximos passos

- Confirmar os parâmetros de link de afiliado do Mercado Livre (painel de afiliados)
- Fase 2: geração de imagem (Nano Banana / Gemini Image) e copy de venda
- Fase 3+: WhatsApp, agendamento, painel web, Shopee
