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
