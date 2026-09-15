import { readFile } from "node:fs/promises";
import type { MlOffer } from "../types.js";

/**
 * Carrega ofertas encontradas por navegação assistida (Claude navegando em
 * mercadolivre.com.br/ofertas) e salvas nesse formato de JSON. Ver README
 * para o formato esperado do arquivo.
 */
export async function loadDiscoveredOffers(filePath: string): Promise<MlOffer[]> {
  const raw = await readFile(filePath, "utf-8");
  const offers = JSON.parse(raw) as MlOffer[];
  return offers;
}
