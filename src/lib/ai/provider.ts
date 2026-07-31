import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Provider AI terpusat — SATU pintu untuk semua fitur.
 * Ganti provider cukup di sini (DeepSeek / OpenAI / OpenRouter / lokal).
 *
 * Env yang dibaca:
 *   AI_PROVIDER  = "openai" | "deepseek" | "openrouter"
 *   AI_API_KEY   = API key provider
 *   AI_MODEL     = nama model (default: deepseek-chat)
 *   AI_BASE_URL  = base URL custom (untuk OpenAI-compatible)
 */

export type AIProvider = "openai" | "deepseek" | "openrouter";

function getEnv(): { provider: AIProvider; apiKey: string; model: string; baseURL?: string } {
  const provider = (process.env.AI_PROVIDER || "deepseek") as AIProvider;
  const apiKey =
    process.env.AI_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    "";

  const model = process.env.AI_MODEL || "deepseek-chat";

  const baseURLs: Record<AIProvider, string | undefined> = {
    openai: process.env.AI_BASE_URL || undefined,
    deepseek: process.env.AI_BASE_URL || "https://api.deepseek.com/v1",
    openrouter: process.env.AI_BASE_URL || "https://openrouter.ai/api/v1",
  };

  return { provider, apiKey, model, baseURL: baseURLs[provider] };
}

let cachedModel: LanguageModel | null = null;

/** Model LLM untuk generateText / streamText / generateObject */
export function getModel(): LanguageModel {
  if (cachedModel) return cachedModel;

  const { apiKey, model, baseURL } = getEnv();

  if (!apiKey) {
    throw new Error(
      "AI_API_KEY belum di-set. Tambahkan ke .env.local — lihat .env.example"
    );
  }

  const openai = createOpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  cachedModel = openai(model);
  return cachedModel;
}

/** Reset cache (dipakai saat testing / ganti env) */
export function resetModelCache() {
  cachedModel = null;
}
