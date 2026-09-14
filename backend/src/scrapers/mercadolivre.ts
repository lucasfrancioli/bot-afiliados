export interface MlOffer {
  id: string;
  title: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number;
  rating: number | null;
  reviewsTotal: number;
  permalink: string;
  thumbnail: string;
}

interface MlSearchResult {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  permalink: string;
  thumbnail: string;
}

interface MlReviewsResult {
  rating_average: number;
  total: number;
}

const SEARCH_ENDPOINT = "https://api.mercadolibre.com/sites/MLB/search";
const REVIEWS_ENDPOINT = "https://api.mercadolibre.com/reviews/item";

/**
 * Busca itens no Mercado Livre via API pública de busca (sem autenticação).
 * Para cada resultado, busca a avaliação em uma chamada separada, já que
 * o endpoint de busca não retorna nota média.
 */
export async function searchOffers(
  query: string,
  categoryId?: string,
  accessToken?: string
): Promise<MlOffer[]> {
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  if (categoryId) url.searchParams.set("category", categoryId);

  const res = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  });
  if (res.status === 403) {
    throw new Error(
      "Mercado Livre recusou a busca (403). Esse endpoint deixou de aceitar requisições " +
        "sem autenticação — é necessário um access_token de uma aplicação registrada em " +
        "developers.mercadolivre.com.br (defina ML_ACCESS_TOKEN no .env)."
    );
  }
  if (!res.ok) {
    throw new Error(`Busca no Mercado Livre falhou: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { results: MlSearchResult[] };

  const offers = await Promise.all(
    data.results.map(async (item): Promise<MlOffer> => {
      const discountPercent = item.original_price
        ? Math.round((1 - item.price / item.original_price) * 100)
        : 0;

      const { rating, reviewsTotal } = await fetchRating(item.id);

      return {
        id: item.id,
        title: item.title,
        price: item.price,
        originalPrice: item.original_price,
        discountPercent,
        rating,
        reviewsTotal,
        permalink: item.permalink,
        thumbnail: item.thumbnail
      };
    })
  );

  return offers;
}

async function fetchRating(itemId: string): Promise<{ rating: number | null; reviewsTotal: number }> {
  try {
    const res = await fetch(`${REVIEWS_ENDPOINT}/${itemId}`);
    if (!res.ok) return { rating: null, reviewsTotal: 0 };
    const data = (await res.json()) as MlReviewsResult;
    return { rating: data.rating_average ?? null, reviewsTotal: data.total ?? 0 };
  } catch {
    return { rating: null, reviewsTotal: 0 };
  }
}
