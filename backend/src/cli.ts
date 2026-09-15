import { config } from "./config.js";
import { loadDiscoveredOffers } from "./scrapers/offers-input.js";
import { filterOffers } from "./scrapers/filter.js";
import { toAffiliateLink } from "./affiliate/mercadolivre.js";

async function main() {
  const args = process.argv.slice(2);
  const urlFlagIndex = args.indexOf("--url");

  if (urlFlagIndex !== -1) {
    const url = args[urlFlagIndex + 1];
    if (!url) {
      throw new Error("Use: npm run dev -- --url <link do produto>");
    }
    runManualLink(url);
    return;
  }

  const inputPath = args[0] ?? "data/offers.example.json";
  await runDiscoveryBatch(inputPath);
}

/**
 * Produto escolhido manualmente por você — pula o filtro de desconto/nota
 * (você já decidiu que quer esse produto) e só gera o link de afiliado.
 */
function runManualLink(url: string) {
  const link = toAffiliateLink(url, config.ml.affiliateParamName, config.ml.affiliateParamValue);
  console.log(`Link de afiliado: ${link}`);
}

async function runDiscoveryBatch(inputPath: string) {
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
