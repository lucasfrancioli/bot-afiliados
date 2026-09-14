import { config } from "./config.js";
import { searchOffers } from "./scrapers/mercadolivre.js";
import { filterOffers } from "./scrapers/filter.js";
import { toAffiliateLink } from "./affiliate/mercadolivre.js";

async function main() {
  console.log(`Buscando: "${config.ml.searchQuery}"...`);
  const offers = await searchOffers(config.ml.searchQuery, config.ml.categoryId, config.ml.accessToken);
  console.log(`${offers.length} resultado(s) encontrado(s) na busca.`);

  const selected = filterOffers(offers, {
    minDiscountPercent: config.ml.minDiscountPercent,
    minRating: config.ml.minRating,
    maxResults: config.ml.maxResults
  });

  if (selected.length === 0) {
    console.log("Nenhuma oferta passou nos critérios (desconto/nota mínimos).");
    return;
  }

  console.log(`\n${selected.length} oferta(s) selecionada(s):\n`);
  for (const offer of selected) {
    const link = toAffiliateLink(
      offer.permalink,
      config.ml.affiliateParamName,
      config.ml.affiliateParamValue
    );
    console.log(`- ${offer.title}`);
    console.log(`  R$ ${offer.price} (${offer.discountPercent}% off) | nota: ${offer.rating ?? "N/A"} (${offer.reviewsTotal} avaliações)`);
    console.log(`  ${link}\n`);
  }
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
