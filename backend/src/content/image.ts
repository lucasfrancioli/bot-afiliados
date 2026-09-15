import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Baixa a foto real do produto (thumbnail capturado na descoberta) sem
 * nenhum overlay ou geração por IA — decisão do usuário (2026-09-15):
 * a imagem vai direto pro grupo de WhatsApp como está.
 */
export async function downloadProductImage(
  imageUrl: string,
  destDir: string,
  fileName: string
): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem do produto (${response.status}): ${imageUrl}`);
  }

  await mkdir(destDir, { recursive: true });
  const buffer = Buffer.from(await response.arrayBuffer());
  const destPath = path.join(destDir, fileName);
  await writeFile(destPath, buffer);
  return destPath;
}
