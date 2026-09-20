import fs from "node:fs/promises";
import { config } from "./config.js";
import { loadDiscoveredOffers } from "./scrapers/offers-input.js";
import { filterOffers } from "./scrapers/filter.js";
import { toAffiliateLink } from "./affiliate/mercadolivre.js";
import { generateContentForOffer } from "./content/generate.js";
import { connectWhatsApp, findGroupByName } from "./whatsapp/client.js";
import { sendQueueToGroup, type QueueItem } from "./whatsapp/queue.js";

const PENDING_PATH = "data/pending-send.json";

async function main() {
  const args = process.argv.slice(2);
  const urlFlagIndex = args.indexOf("--url");
  const groupFlagIndex = args.indexOf("--whatsapp-send");
  const loginFlagIndex = args.indexOf("--whatsapp-login");
  const prepareFlagIndex = args.indexOf("--prepare");
  const sendPendingFlagIndex = args.indexOf("--send-pending");

  if (urlFlagIndex !== -1) {
    const url = args[urlFlagIndex + 1];
    if (!url) {
      throw new Error("Use: npm run dev -- --url <link do produto>");
    }
    runManualLink(url);
    return;
  }

  if (loginFlagIndex !== -1) {
    await runWhatsAppLogin();
    return;
  }

  // --prepare: descobre + gera link/copy/imagem e SALVA em data/pending-send.json,
  // sem tocar no WhatsApp. Pensado pra rodar sozinho (ex: Tarefa Agendada) —
  // o envio de verdade fica pra --send-pending, disparado só depois de alguém
  // aprovar (ver scripts/daily-run.ps1 e CLAUDE.md).
  if (prepareFlagIndex !== -1) {
    const inputPath = args[prepareFlagIndex + 1] ?? "data/offers.example.json";
    await runPrepare(inputPath);
    return;
  }

  // --send-pending: lê data/pending-send.json (já preparado por --prepare) e manda
  // pro grupo. Não gera copy/imagem de novo — não gasta cota do Gemini.
  if (sendPendingFlagIndex !== -1) {
    const groupName = args[sendPendingFlagIndex + 1];
    if (!groupName) {
      throw new Error('Use: npm run dev -- --send-pending "Nome do Grupo"');
    }
    await runSendPending(groupName);
    return;
  }

  if (groupFlagIndex !== -1) {
    const groupName = args[groupFlagIndex + 1];
    if (!groupName) {
      throw new Error('Use: npm run dev -- --whatsapp-send "Nome do Grupo" [caminho-offers.json]');
    }
    const inputPath = args[groupFlagIndex + 2] ?? "data/offers.example.json";
    await runDiscoveryBatch(inputPath, groupName);
    return;
  }

  const inputPath = args[0] ?? "data/offers.example.json";
  await runDiscoveryBatch(inputPath);
}

/**
 * Só conecta e mantém a sessão aberta até você escanear o QR (salvo em
 * data/whatsapp-qr.png). Depois disso a sessão fica salva em
 * data/baileys-auth e os próximos comandos não pedem QR de novo.
 */
async function runWhatsAppLogin() {
  console.log("Conectando ao WhatsApp... aguarde o QR code em data/whatsapp-qr.png");
  await connectWhatsApp();
  // Pequena folga antes do exit: garante que qualquer creds.update disparado
  // bem no instante do "open" já terminou de gravar em disco.
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log("Sessão pronta e salva. Pode rodar --whatsapp-send agora.");
  process.exit(0);
}

/**
 * Produto escolhido manualmente por você — pula o filtro de desconto/nota
 * (você já decidiu que quer esse produto) e só gera o link de afiliado.
 */
function runManualLink(url: string) {
  const link = toAffiliateLink(url, config.ml.mattWord, config.ml.mattTool);
  console.log(`Link de afiliado: ${link}`);
}

/**
 * Carrega, filtra e gera link/copy/imagem pra cada oferta selecionada.
 * Compartilhado entre --prepare e o modo antigo (--whatsapp-send /
 * default), pra não duplicar a lógica de seleção+geração de conteúdo.
 */
async function buildQueue(inputPath: string): Promise<QueueItem[]> {
  console.log(`Carregando ofertas de: ${inputPath}`);
  const offers = await loadDiscoveredOffers(inputPath);
  console.log(`${offers.length} oferta(s) carregada(s).`);

  const selected = filterOffers(offers, {
    minDiscountPercent: config.ml.minDiscountPercent,
    minRating: config.ml.minRating,
    maxResults: config.ml.maxResults
  });

  if (selected.length === 0) {
    console.log("Nenhuma oferta passou nos critérios (desconto/nota mínimos).");
    return [];
  }

  console.log(`\n${selected.length} oferta(s) selecionada(s):\n`);
  const queue: QueueItem[] = [];
  for (const offer of selected) {
    const link = toAffiliateLink(offer.permalink, config.ml.mattWord, config.ml.mattTool);
    console.log(`- ${offer.title}`);
    console.log(`  R$ ${offer.price} (${offer.discountPercent}% off) | nota: ${offer.rating ?? "N/A"} (${offer.reviewsTotal} avaliações)`);
    console.log(`  ${link}`);

    const content = await generateContentForOffer(offer, link);
    console.log(content.imagePath ? `  Imagem: ${content.imagePath}` : `  Imagem: falhou (${content.imageError})`);
    console.log(content.copy ? `  Copy:\n${content.copy}\n` : `  Copy: falhou (${content.copyError})\n`);

    if (content.copy) {
      queue.push({ text: content.copy, imagePath: content.imagePath, title: offer.title });
    }
  }

  return queue;
}

async function runPrepare(inputPath: string) {
  const queue = await buildQueue(inputPath);
  await fs.writeFile(PENDING_PATH, JSON.stringify(queue, null, 2));
  console.log(`\n${queue.length} item(ns) prontos, salvos em ${PENDING_PATH}.`);
  console.log('Rode "npm run dev -- --send-pending \\"Nome do Grupo\\"" pra enviar de verdade.');
}

async function runSendPending(whatsappGroupName: string) {
  const raw = await fs.readFile(PENDING_PATH, "utf8").catch(() => {
    throw new Error(`${PENDING_PATH} não existe — rode --prepare primeiro.`);
  });
  const queue: QueueItem[] = JSON.parse(raw);

  if (queue.length === 0) {
    console.log("Fila pendente está vazia, nada a enviar.");
    return;
  }

  console.log(`Conectando ao WhatsApp para enviar no grupo "${whatsappGroupName}"...`);
  const sock = await connectWhatsApp();
  const group = await findGroupByName(whatsappGroupName);
  if (!group) {
    throw new Error(`Grupo "${whatsappGroupName}" não encontrado entre os grupos do WhatsApp conectado.`);
  }

  console.log(`Enviando ${queue.length} oferta(s) para o grupo, com delay entre mensagens...`);
  await sendQueueToGroup(
    sock,
    group.id,
    queue,
    (i, item) => console.log(`  [${i + 1}/${queue.length}] enviado: ${item.text.slice(0, 40)}...`),
    (i, item, err) => console.error(`  [${i + 1}/${queue.length}] falhou: ${err.message}`)
  );
  console.log("Envio concluído.");
  // Evita reenviar a mesma fila de novo por engano numa próxima chamada.
  await fs.rename(PENDING_PATH, `${PENDING_PATH}.sent-${Date.now()}`);
  process.exit(0);
}

async function runDiscoveryBatch(inputPath: string, whatsappGroupName?: string) {
  const queue = await buildQueue(inputPath);
  if (queue.length === 0 || !whatsappGroupName) return;

  console.log(`Conectando ao WhatsApp para enviar no grupo "${whatsappGroupName}"...`);
  const sock = await connectWhatsApp();
  const group = await findGroupByName(whatsappGroupName);
  if (!group) {
    throw new Error(`Grupo "${whatsappGroupName}" não encontrado entre os grupos do WhatsApp conectado.`);
  }

  console.log(`Enviando ${queue.length} oferta(s) para o grupo, com delay entre mensagens...`);
  await sendQueueToGroup(
    sock,
    group.id,
    queue,
    (i, item) => console.log(`  [${i + 1}/${queue.length}] enviado: ${item.text.slice(0, 40)}...`),
    (i, item, err) => console.error(`  [${i + 1}/${queue.length}] falhou: ${err.message}`)
  );
  console.log("Envio concluído.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
