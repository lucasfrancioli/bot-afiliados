import pkg from "whatsapp-web.js";
import type { Chat } from "whatsapp-web.js";
import qrcode from "qrcode";
import path from "node:path";

const { Client, LocalAuth } = pkg;

const QR_PATH = path.join("data", "whatsapp-qr.png");

let client: InstanceType<typeof Client> | null = null;

/**
 * Sobe o cliente do WhatsApp Web e resolve quando a sessão está pronta para
 * enviar mensagens. Na primeira vez (sem sessão salva) salva o QR code em
 * data/whatsapp-qr.png para o usuário escanear com o número dedicado do bot.
 * Sessões seguintes reusam data/.wwebjs_auth e não pedem QR de novo.
 */
export async function connectWhatsApp(): Promise<InstanceType<typeof Client>> {
  if (client) return client;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: "data/.wwebjs_auth" }),
    puppeteer: { headless: true }
  });

  client.on("qr", async (qr) => {
    await qrcode.toFile(QR_PATH, qr, { width: 512 });
    console.log(`QR code salvo em ${QR_PATH} — escaneie com o WhatsApp do número dedicado.`);
  });

  client.on("authenticated", () => console.log("WhatsApp autenticado."));
  client.on("auth_failure", (msg) => console.error("Falha de autenticação do WhatsApp:", msg));
  client.on("disconnected", (reason) => console.error("WhatsApp desconectado:", reason));

  const ready = new Promise<void>((resolve) => client!.once("ready", () => resolve()));
  await client.initialize();
  await ready;

  return client;
}

export async function findGroupByName(name: string): Promise<Chat | null> {
  if (!client) throw new Error("Chame connectWhatsApp() antes de buscar grupos.");
  const chats = await client.getChats();
  const normalized = name.trim().toLowerCase();
  return chats.find((chat) => chat.isGroup && chat.name.trim().toLowerCase() === normalized) ?? null;
}
