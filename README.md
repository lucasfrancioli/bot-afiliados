# Bot de Afiliados — Mercado Livre & Shopee

Automação de busca de ofertas de produtos para casa, geração de imagem/copy via IA e envio no WhatsApp. Arquitetura completa em [`docs/arquitetura.md`](docs/arquitetura.md).

## Status

**Fase 1 funcionando** — descoberta de ofertas + filtro por desconto/nota + conversor de link de afiliado, testável via CLI.

**Importante — mudança de arquitetura:** a API pública de busca do Mercado Livre (`/sites/MLB/search`) está bloqueada para aplicações comuns desde abril/2025 (403, mesmo com token OAuth válido — confirmado em teste). O programa de afiliados do ML também nunca teve API oficial. Por isso, a descoberta de ofertas passou a ser feita por **navegação assistida**: Claude visita `mercadolivre.com.br/ofertas` (filtrado por categoria) e extrai nota, desconto e link de cada produto, do mesmo jeito que qualquer visitante veria a página — sem tocar em endpoint nenhum bloqueado. O resultado dessa navegação vira o arquivo `backend/data/offers.json`, que o pipeline consome.

Isso significa que a etapa de descoberta depende de uma sessão ativa (o notebook/navegador precisa estar ligado nos horários de busca); o resto do pipeline (link de afiliado, imagem, copy, fila, WhatsApp, painel) roda de forma independente no VPS.

## Rodando a Fase 1

```bash
cd backend
npm install
cp .env.example .env   # ajuste os critérios se quiser
npm run dev -- data/offers.example.json
```

Isso carrega as ofertas do arquivo, filtra pelos critérios configurados (`MIN_DISCOUNT_PERCENT`, `MIN_RATING`) e imprime os links (com o parâmetro de afiliado, depois de preenchido no `.env`). `data/offers.example.json` tem 5 ofertas reais coletadas por navegação como exemplo do formato esperado.

### Produto escolhido manualmente

Se você já tem o link de um produto específico que quer divulgar (não veio da descoberta automática), pula direto pra conversão de afiliado:

```bash
npm run dev -- --url "https://www.mercadolivre.com.br/link-do-produto"
```

Esse modo ignora o filtro de desconto/nota — o produto já foi escolhido por você.

### Horários de descoberta

Configuráveis em [`backend/config/schedule.json`](backend/config/schedule.json) (`discoveryTimes`). Edite esse arquivo a qualquer momento, ou peça pro Claude ajustar, pra adicionar/mudar os horários em que a navegação assistida roda.

## Próximos passos

- Confirmar os parâmetros de link de afiliado do Mercado Livre (painel de afiliados)
- Definir o mecanismo real de disparo automático nos horários de `schedule.json` (depende de manter uma sessão do Claude ativa no notebook — ainda não resolvido)
- Fase 2: geração de imagem (Nano Banana / Gemini Image) e copy de venda
- Fase 3+: WhatsApp, agendamento, painel web, Shopee
