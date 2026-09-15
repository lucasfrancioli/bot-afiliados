import type { MlOffer } from "../types.js";
import { generateText } from "./gemini.js";

/**
 * O gancho (única parte livre/criativa) vem do Gemini; o resto da mensagem
 * é montado por template fixo com os dados reais da oferta — evita o
 * modelo inventar ou desalinhar preço, loja, link etc, e garante o mesmo
 * formato em toda mensagem (pedido do usuário, baseado num exemplo real).
 */
export async function generateCopy(offer: MlOffer, affiliateLink: string): Promise<string> {
  const hook = await generateText(buildHookPrompt(offer));
  return buildMessage(offer, affiliateLink, hook.replace(/^\*+|\*+$/g, "").trim());
}

function buildHookPrompt(offer: MlOffer): string {
  return `Escreva só a linha de abertura (gancho) de uma mensagem de WhatsApp divulgando esta oferta real de produto para casa. Vai ser postada ao lado de várias outras ofertas do dia, então precisa ser criativa e diferente das demais para chamar atenção de verdade — nada de fórmula robótica repetida (evite abrir sempre com "🔥 OLHA QUE ACHADO" ou "CORRE QUE ACABA"; invente um gancho novo e inesperado, pode ser humor, curiosidade, uma pergunta, uma cena do dia a dia onde o produto resolve um problema, etc).

Antes de escrever, identifique com precisão o que o produto realmente é e para qual cômodo/uso ele serve, só pelo nome/título abaixo (ex: "Cadeira Executiva ... Reclinável" é cadeira de escritório/home office, não de sala de jantar). O gancho tem que ser coerente com o uso real do produto — nunca invente um cenário ou cômodo errado só para soar mais criativo.

Produto: ${offer.title}

Responda só com essa única linha (pode ter 1-2 emojis), sem aspas, sem explicação, sem o resto da mensagem.`;
}

function buildMessage(offer: MlOffer, affiliateLink: string, hook: string): string {
  const emoji = pickProductEmoji(offer.title);
  const precoLinhas = offer.originalPrice
    ? `💰 De: R$ ${formatPrice(offer.originalPrice)}\n💰 Por: R$ ${formatPrice(offer.price)} (${offer.discountPercent}% OFF)`
    : `💰 Preço: R$ ${formatPrice(offer.price)}`;

  return `*${hook}*

${emoji} ${offer.title}

🏪 Loja: Mercado Livre
${precoLinhas}

👉 Comprar:
${affiliateLink}

💛 Ao abrir o link, clique em *SEGUIR*!

⚠️ *Preço sujeito a alteração a qualquer momento.*

🏠 Achados de Casa | Achadinhos & Promoções

#achadinho`;
}

function formatPrice(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

const EMOJI_BY_KEYWORD: Array<[RegExp, string]> = [
  [/cadeira|poltrona/i, "🪑"],
  [/câmera|camera|segurança/i, "📷"],
  [/fechadura|cadeado|chave/i, "🔒"],
  [/colchão|colcho|cama|travesseiro/i, "🛏️"],
  [/cozinha|panela|air ?fryer|liquidificador/i, "🍳"],
  [/organizador|caixa|prateleira/i, "🗄️"],
  [/luminária|lâmpada|luz/i, "💡"],
  [/ventilador|climatiz/i, "🌬️"]
];

function pickProductEmoji(title: string): string {
  const match = EMOJI_BY_KEYWORD.find(([pattern]) => pattern.test(title));
  return match ? match[1] : "🏠";
}
