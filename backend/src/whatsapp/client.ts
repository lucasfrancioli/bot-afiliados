import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { pino } from "pino";
import qrcode from "qrcode";
import path from "node:path";

const QR_PATH = path.join("data", "whatsapp-qr.png");
const AUTH_PATH = path.join("data", "baileys-auth");

let sock: WASocket | null = null;

/**
 * Sobe a conexão com o WhatsApp via Baileys (WebSocket direto no protocolo
 * multi-device, sem browser/Puppeteer por trás). Na primeira vez (sem sessão
 * salva) salva o QR code em data/whatsapp-qr.png para o usuário escanear com
 * o número dedicado do bot. Sessões seguintes reusam data/baileys-auth e não
 * pedem QR de novo.
 *
 * Uma única tentativa de conexão — sem retry/reconnect automático em cima de
 * falha real. A única exceção é `restartRequired` (ver openConnection), que é
 * um passo esperado do próprio protocolo de pareamento, não uma falha. Fora
 * isso, qualquer erro propaga e para; reconectar automaticamente em loop foi
 * o que já causou um flag de "em análise" na conta real (ver histórico do
 * projeto). Decisão de tentar de novo além disso é sempre manual, do usuário.
 */
export async function connectWhatsApp(): Promise<WASocket> {
  if (sock) return sock;

  // useMultiFileAuthState é chamado UMA vez só e reusado em toda a conexão,
  // inclusive na reconexão de restartRequired abaixo. Chamá-lo de novo por
  // tentativa abre um segundo leitor/escritor independente da mesma pasta —
  // foi exatamente isso que corrompeu data/baileys-auth/creds.json (ficou
  // vazio) numa versão anterior deste arquivo: as duas escritas concorrentes
  // (creds.update de cada instância) se pisaram.
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);
  sock = await openConnection(state, saveCreds);
  return sock;
}

async function openConnection(
  state: Awaited<ReturnType<typeof useMultiFileAuthState>>["state"],
  saveCreds: Awaited<ReturnType<typeof useMultiFileAuthState>>["saveCreds"],
  allowRestartOnce = true
): Promise<WASocket> {
  const client = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    syncFullHistory: false
  });

  // Rastreia a promise da última escrita de creds.json. O evento
  // "creds.update" é fire-and-forget (client.ev.on não é aguardado pelo
  // fluxo de conexão), então sem isso dá pra chegar em "open" e sair do
  // processo (process.exit em cli.ts) ANTES da escrita terminar — writeFile
  // trunca o arquivo antes de escrever, e um exit no meio disso é o que
  // deixou creds.json com 0 bytes numa versão anterior. Aguardamos essa
  // promise abaixo antes de considerar a conexão pronta.
  let pendingSave: Promise<void> | null = null;
  client.ev.on("creds.update", () => {
    pendingSave = saveCreds();
  });

  return new Promise<WASocket>((resolve, reject) => {
    let settled = false;

    client.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        await qrcode.toFile(QR_PATH, qr, { width: 512 });
        console.log(`QR code salvo em ${QR_PATH} — escaneie com o WhatsApp do número dedicado.`);
      }

      if (connection === "open") {
        if (pendingSave) await pendingSave;
        console.log("WhatsApp conectado.");
        settled = true;
        resolve(client);
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        const restartRequired = statusCode === DisconnectReason.restartRequired;

        // Passo documentado do pareamento: assim que o QR é escaneado e as
        // credenciais são salvas (creds.update), o WhatsApp fecha esse
        // primeiro stream de propósito e espera uma única reconexão pra
        // completar a sessão. Não é erro nem retry de falha — é o protocolo
        // funcionando como esperado, acontece uma vez só por login. Reusa o
        // MESMO (state, saveCreds) — não relê a pasta de credenciais de novo.
        if (restartRequired && allowRestartOnce && !settled) {
          console.log("QR escaneado, credenciais salvas. Completando conexão (passo normal do pareamento)...");
          settled = true;
          openConnection(state, saveCreds, false).then(resolve, reject);
          return;
        }

        const reason = loggedOut
          ? "Sessão encerrada (logout) — apague data/baileys-auth e rode --whatsapp-login de novo para escanear um QR novo."
          : lastDisconnect?.error?.message ?? "motivo desconhecido";
        console.error("WhatsApp desconectado antes de ficar pronto:", reason);
        if (!settled) {
          settled = true;
          reject(new Error(`Conexão com WhatsApp fechada: ${reason}`));
        }
      }
    });
  });
}

export interface WhatsAppGroup {
  id: string;
  name: string;
}

export async function findGroupByName(name: string): Promise<WhatsAppGroup | null> {
  if (!sock) throw new Error("Chame connectWhatsApp() antes de buscar grupos.");
  const groups = await sock.groupFetchAllParticipating();
  const normalized = name.trim().toLowerCase();
  const match = Object.values(groups).find(
    (group) => (group.subject ?? "").trim().toLowerCase() === normalized
  );
  return match ? { id: match.id, name: match.subject } : null;
}
