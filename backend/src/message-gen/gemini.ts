import { config } from "../config.js";

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function generateText(prompt: string): Promise<string> {
  if (!config.gemini.apiKey) {
    throw new Error("GEMINI_API_KEY não configurada em backend/.env");
  }

  const response = await fetch(`${GEMINI_URL}?key=${config.gemini.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 1.1 }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API retornou ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API não retornou texto na resposta.");
  }
  return text.trim();
}
