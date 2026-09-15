# Bot de Afiliados — Mercado Livre & Shopee

Automação de busca de ofertas de produtos para casa, geração de copy via IA (usando a foto real do produto, sem imagem gerada) e envio no WhatsApp. Arquitetura completa em [`docs/arquitetura.md`](docs/arquitetura.md).

## Status

**Fase 1 e 2 funcionando** — descoberta de ofertas + filtro por desconto/nota + conversor de link de afiliado + geração de copy via Gemini, testável via CLI. **Fase 3 (WhatsApp) em andamento.**

**Decisão (15/set/2026):** a etapa de imagem não usa IA (Nano Banana/Gemini Image) — a geração de imagem estava bloqueada por billing e o usuário decidiu usar a **foto real do produto** (já capturada na descoberta) direto no envio, sem overlay. Simplifica o pipeline e remove essa dependência.

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

## Rodando a Fase 2 (copy)

Já roda junto com o comando acima — para cada oferta selecionada, gera a copy de venda via Gemini e baixa a foto do produto (campo `thumbnail` do offer) em `backend/data/generated/`. Precisa de `GEMINI_API_KEY` no `.env` (pegue em aistudio.google.com).

## Rodando a Fase 3 (WhatsApp)

Use um número dedicado (não o pessoal) — automação de WhatsApp Web viola os Termos de Uso, ver risco descrito em [`docs/arquitetura.md`](docs/arquitetura.md).

```bash
npm run dev -- --whatsapp-login   # primeira vez: escaneie o QR salvo em data/whatsapp-qr.png
npm run dev -- --whatsapp-send "Nome do Grupo" data/offers.example.json
```

A sessão fica salva em `backend/data/.wwebjs_auth/` — não precisa escanear de novo nas próximas execuções. O envio respeita delay aleatório de 28-45s entre mensagens.

## Próximos passos

- Definir o mecanismo real de disparo automático nos horários de `schedule.json` — vai ser configurado no notebook dedicado à automação, ainda pendente
- Fase 4+: agendamento automático, painel web, Shopee
