import { config } from "./config.js";
import { loadDiscoveredOffers } from "./scrapers/offers-input.js";
import { filterOffers } from "./scrapers/filter.js";
import { toAffiliateLink } from "./affiliate/mercadolivre.js";

async function main() {
  const inputPath = process.argv[2] ?? "data/offers.example.json";
  console.log(`Carregando ofertas de: ${inputPath}`);
  const offers = await loadDiscoveredOffers(inputPath);
  console.log(`${offers.length} oferta(s) carregada(s).`);

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
