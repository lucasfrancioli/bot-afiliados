# Disparado pela Tarefa Agendada "BotAfiliadosDiario" (09h/12h/16h/20h).
# Roda uma sessao headless do Claude Code que: navega o ML de verdade (via
# extensao Claude in Chrome) pra achar ofertas de casa, gera link/copy/imagem
# e salva tudo em backend/data/pending-send.json -- e SO ISSO. Nao toca no
# WhatsApp. Manda a previa pro Telegram do usuario e para.
#
# O envio de verdade (--send-pending) e feito depois, manualmente, pela
# sessao do Telegram sempre ativa (ClaudeTelegramChannel), só quando o
# usuario aprova. Por isso essa tarefa roda com uma lista de ferramentas
# BEM restrita (sem bypassPermissions) -- ela fisicamente nao consegue
# mexer no WhatsApp nem em mais nada fora do escopo abaixo.
#
# Regras de seguranca completas em CLAUDE.md na raiz do repo.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$logDir = Join-Path $repoRoot "scripts\logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}
$logFile = Join-Path $logDir ("daily-run-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))

$allowedTools = @(
    "mcp__claude-in-chrome__navigate",
    "mcp__claude-in-chrome__read_page",
    "mcp__claude-in-chrome__find",
    "mcp__claude-in-chrome__javascript_tool",
    "mcp__claude-in-chrome__tabs_context_mcp",
    "mcp__claude-in-chrome__tabs_create_mcp",
    "mcp__claude-in-chrome__tabs_close_mcp",
    "mcp__claude-in-chrome__get_page_text",
    "mcp__claude-in-chrome__browser_batch",
    "mcp__claude-in-chrome__list_connected_browsers",
    "mcp__plugin_telegram_telegram__reply",
    "Edit(backend/data/offers.json)",
    "Bash(cd backend && npm run dev -- --prepare*)"
) -join " "

$prompt = @'
Rode a etapa de PREPARO (nao envio) da automacao diaria do bot de afiliados. Siga o CLAUDE.md
deste repo. Voce NAO tem permissao pra tocar no WhatsApp nessa execucao -- isso e proposital,
nem tente.

REGRA OBRIGATORIA, sem excecao: seu ULTIMO passo, sempre, e chamar a ferramenta de reply do
plugin telegram (chat_id "8685488954"). Isso vale tanto se tudo der certo quanto se travar logo
no passo 1 (ex: navegador desconectado) -- nunca termine so respondendo em texto, sem chamar a
ferramenta de fato. Ninguem le o que voce responde em texto aqui; so o que voce manda pela
ferramenta chega em algum lugar.

1. Navegue no Chrome ate mercadolivre.com.br/ofertas, filtrando pela categoria Casa, Moveis e
   Decoracao. Colete 5 produtos bons: priorize selo "Oferta Imperdivel" ou desconto de 40% ou
   mais, com nota 4.5+ e bom volume de avaliacoes (evite produtos com poucas avaliacoes). Para
   cada um pegue: titulo, preco atual, preco original, % de desconto, nota, numero de avaliacoes,
   link permanente do produto (permalink) e a URL da foto principal (thumbnail).

2. Salve como JSON em backend/data/offers.json, seguindo exatamente o formato de
   backend/data/offers.example.json (campos: id, title, price, originalPrice, discountPercent,
   rating, reviewsTotal, permalink, thumbnail).

3. Dentro da pasta backend, rode:
   npm run dev -- --prepare data/offers.json
   Isso gera link de afiliado, copy e imagem de cada oferta e salva em
   backend/data/pending-send.json -- sem mandar nada pro WhatsApp.

4. Mande a previa por Telegram usando a ferramenta de reply do plugin telegram, chat_id
   "8685488954": liste as ofertas preparadas (titulo + preco + desconto), quantas falharam na
   geracao de copy (cota do Gemini e limitada, as vezes acontece), e termine perguntando se pode
   mandar pro grupo "Achadinhos de casa (G2)" -- deixe claro que o envio so acontece se a pessoa
   responder confirmando.

Se a etapa 1 ou 3 falhar de um jeito que trava tudo, reporte isso claramente no passo 4 em vez
de insistir tentando de novo sozinho.
'@

# O prompt precisa vir ANTES de --allowedTools -- --allowedTools e uma
# opcao variadica (aceita varios valores) e engole qualquer coisa depois
# dela, inclusive o prompt, se ele vier depois. "--" nao resolve isso aqui.
# --chrome: sem essa flag, a sessao headless nem tenta conectar no
# navegador -- as ferramentas mcp__claude-in-chrome__* nao ficam disponiveis
# de jeito nenhum, mesmo estando na lista de --allowedTools.
claude -p $prompt --chrome --allowedTools $allowedTools *>&1 | Tee-Object -FilePath $logFile -Encoding utf8
