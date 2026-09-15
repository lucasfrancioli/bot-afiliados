import type { MlOffer } from "../types.js";
import { generateText } from "./gemini.js";

export async function generateCopy(offer: MlOffer, affiliateLink: string): Promise<string> {
  return generateText(buildPrompt(offer, affiliateLink));
}

function buildPrompt(offer: MlOffer, affiliateLink: string): string {
  const preco = offer.originalPrice
    ? `De R$ ${offer.originalPrice} por R$ ${offer.price} (${offer.discountPercent}% OFF)`
    : `R$ ${offer.price}`;
  const avaliacao = offer.rating
    ? `Avaliação: ${offer.rating} (${offer.reviewsTotal} avaliações)`
    : "";

  return `Escreva uma mensagem para um grupo de WhatsApp de "Achados de Casa", divulgando esta oferta real de produto para casa. Ela vai ser postada ao lado de várias outras ofertas do dia, então precisa ser criativa e diferente das demais para chamar atenção de verdade — nada de fórmula robótica repetida (evite abrir sempre com "🔥 OLHA QUE ACHADO" ou "CORRE QUE ACABA"; invente um gancho novo e inesperado para este produto específico, pode ser humor, curiosidade, uma pergunta, uma cena do dia a dia onde o produto resolve um problema, etc).

Antes de escrever, identifique com precisão o que o produto realmente é e para qual cômodo/uso ele serve, só pelo nome/título abaixo (ex: "Cadeira Executiva ... Reclinável" é cadeira de escritório/home office, não de sala de jantar; um produto "para churrasco" não vai na cozinha interna, etc). O gancho criativo e a cena do dia a dia têm que ser coerentes com o uso real do produto — nunca invente um cenário ou cômodo errado só para soar mais criativo. Também não invente preço, desconto ou avaliação além do que está listado abaixo.

Produto: ${offer.title}
Preço: ${preco}
${avaliacao}
Link de afiliado: ${affiliateLink}

Formato de saída: gancho criativo de abertura (com 1 emoji que combine com a ideia, não necessariamente fogo), 1-2 linhas curtas e envolventes sobre o produto/uso real dele, preço em destaque, CTA final variado com o link. Texto puro pronto para colar no WhatsApp, sem markdown.`;
}
