import "dotenv/config";

export const config = {
  ml: {
    minDiscountPercent: Number(process.env.MIN_DISCOUNT_PERCENT ?? 30),
    minRating: Number(process.env.MIN_RATING ?? 4.3),
    maxResults: Number(process.env.MAX_RESULTS ?? 5),
    mattWord: process.env.ML_MATT_WORD || undefined,
    mattTool: process.env.ML_MATT_TOOL || undefined
  }
};
