import type { MlOffer } from "./mercadolivre.js";

export interface FilterCriteria {
  minDiscountPercent: number;
  minRating: number;
  maxResults: number;
}

export function filterOffers(offers: MlOffer[], criteria: FilterCriteria): MlOffer[] {
  return offers
    .filter((offer) => offer.discountPercent >= criteria.minDiscountPercent)
    .filter((offer) => (offer.rating ?? 0) >= criteria.minRating)
    .sort((a, b) => b.discountPercent - a.discountPercent)
    .slice(0, criteria.maxResults);
}
