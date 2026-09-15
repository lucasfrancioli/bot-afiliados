import pkg from "whatsapp-web.js";
import type { Chat } from "whatsapp-web.js";

const { MessageMedia } = pkg;

export interface QueueItem {
  text: string;
  imagePath?: string | null;
}

const MIN_DELAY_MS = 28_000;
const MAX_DELAY_MS = 45_000;

function randomDelayMs(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Envia os itens da fila um a um pro grupo, com delay aleatório de 28-45s
 * entre mensagens (reduz padrão robótico, conforme risco descrito na
 * arquitetura do projeto). Continua a fila mesmo se um item falhar.
 */
export async function sendQueueToGroup(
  chat: Chat,
  items: QueueItem[],
  onItemSent?: (index: number, item: QueueItem) => void,
  onItemError?: (index: number, item: QueueItem, error: Error) => void
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      if (item.imagePath) {
        const media = MessageMedia.fromFilePath(item.imagePath);
        await chat.sendMessage(media, { caption: item.text });
      } else {
        await chat.sendMessage(item.text);
      }
      onItemSent?.(i, item);
    } catch (err) {
      onItemError?.(i, item, err as Error);
    }

    if (i < items.length - 1) {
      await sleep(randomDelayMs());
    }
  }
}
