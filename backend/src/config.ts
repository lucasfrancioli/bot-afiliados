import "dotenv/config";

export const config = {
  ml: {
    searchQuery: process.env.ML_SEARCH_QUERY ?? "organizador de casa",
    categoryId: process.env.ML_CATEGORY_ID || undefined,
    minDiscountPercent: Number(process.env.MIN_DISCOUNT_PERCENT ?? 30),
    minRating: Number(process.env.MIN_RATING ?? 4.3),
    maxResults: Number(process.env.MAX_RESULTS ?? 5),
    affiliateParamName: process.env.ML_AFFILIATE_PARAM_NAME || undefined,
    affiliateParamValue: process.env.ML_AFFILIATE_PARAM_VALUE || undefined,
    accessToken: process.env.ML_ACCESS_TOKEN || undefined
  }
};
