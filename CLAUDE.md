# bot-afiliados — regras de operação

Automação que descobre ofertas de casa no Mercado Livre, gera link de afiliado + copy + imagem,
e posta no grupo de WhatsApp "Achadinhos de casa 🏠 (G2)". Rodando tanto manualmente (sessão
interativa) quanto via Tarefa Agendada do Windows (`scripts/daily-run.ps1`, 4x/dia).

## Regras que NUNCA devem ser quebradas

- **WhatsApp (Baileys, `backend/src/whatsapp/client.ts`): uma única tentativa de conexão por
  execução, sem retry/reconnect automático em loop.** Um loop de reconexão já deixou o número
  dedicado "em análise" pelo WhatsApp/Meta uma vez (histórico real, não hipotético). Se a conexão
  falhar, reporta o erro e para — nunca cria um novo `Client`/`makeWASocket` tentando de novo
  sozinho na mesma execução.
- O nome real do grupo é **"Achadinhos de casa 🏠 (G2)"** (com "inhos"). Confundir com "Achados de
  casa" já causou erro de "grupo não encontrado" antes.
- Cota do Gemini free tier: **20 requisições/dia** (`generativelanguage.googleapis.com`,
  `gemini-3.6-flash`). Um disparo com 5 ofertas usa 5; a automação de 4x/dia já usa a cota inteira
  (4 × 5 = 20) — não há margem para testes manuais extras no mesmo dia sem estourar.
- `backend/.env` (não commitado) tem `ML_MATT_WORD`/`ML_MATT_TOOL` (parâmetros reais de afiliado)
  e `GEMINI_API_KEY`. Nunca comitar esse arquivo nem logar esses valores.
- `backend/data/baileys-auth/` guarda a sessão do WhatsApp — não apagar/recriar sem necessidade
  (perde a sessão e exige escanear QR de novo, o que por si só já é uma reconexão real, evitar
  fazer isso repetidamente no mesmo dia).

## Onde as coisas ficam

- `backend/src/cli.ts` — entrypoint. `npm run dev -- data/offers.json --whatsapp-send "Achadinhos de casa 🏠 (G2)"`
  roda o pipeline completo (filtro → afiliado → copy → imagem → envio).
- `backend/data/offers.json` — input do pipeline (gitignored, é dado de execução, não fonte).
  Formato: array de `MlOffer` (ver `backend/src/types.ts`), mesmo shape de
  `backend/data/offers.example.json`.
- `backend/config/schedule.json` — horários pretendidos de descoberta (09h/12h/16h/20h,
  America/Sao_Paulo).
- `scripts/daily-run.ps1` — script chamado pela Tarefa Agendada "BotAfiliadosDiario" (4 gatilhos
  diários) que roda `claude -p` para: descobrir ofertas via navegador, salvar offers.json, rodar o
  pipeline e reportar o resultado por Telegram (chat_id do usuário).

## Descoberta de ofertas

O Mercado Livre bloqueia scraping via curl/API para terceiros (confirmado, não é bug nosso — ver
histórico do projeto). A única forma que funciona é navegar de verdade via extensão "Claude in
Chrome" (`mercadolivre.com.br/ofertas`, filtrar categoria Casa/Móveis/Decoração), priorizando
selo "Oferta Imperdível" ou desconto 40%+, nota 4.5+ com bom volume de avaliações.
