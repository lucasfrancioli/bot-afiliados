import type { MlOffer } from "../types.js";
import { generateCopy } from "../message-gen/copy.js";
import { downloadProductImage } from "./image.js";

const CONTENT_DIR = "data/generated";

export interface OfferContentResult {
  copy: string | null;
  copyError: string | null;
  imagePath: string | null;
  imageError: string | null;
}

/**
 * Copy e imagem são independentes — se uma falhar (ex: imagem indisponível
 * ou API do Gemini fora do ar), a outra ainda deve ser entregue.
 */
export async function generateContentForOffer(
  offer: MlOffer,
  affiliateLink: string
): Promise<OfferContentResult> {
  const [copyResult, imageResult] = await Promise.allSettled([
    generateCopy(offer, affiliateLink),
    downloadProductImage(offer.thumbnail, CONTENT_DIR, `${offer.id}.jpg`)
  ]);

  return {
    copy: copyResult.status === "fulfilled" ? copyResult.value : null,
    copyError: copyResult.status === "rejected" ? (copyResult.reason as Error).message : null,
    imagePath: imageResult.status === "fulfilled" ? imageResult.value : null,
    imageError: imageResult.status === "rejected" ? (imageResult.reason as Error).message : null
  };
}
