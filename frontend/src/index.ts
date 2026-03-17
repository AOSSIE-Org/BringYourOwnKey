import type { BYOKConfig, BYOKHeaders } from "./types";
import { KeyManager } from "./KeyManager";
import { SettingsUI } from "./SettingsUI";

export type { BYOKConfig, BYOKHeaders, Provider, ModelOption, StoredSettings } from "./types";
export { KeyManager } from "./KeyManager";
export { SettingsUI } from "./SettingsUI";

// ── Built-in Provider Presets ────────────────────────────────────────────────

export const PROVIDERS = {
  groq: {
    id: "groq",
    label: "Groq (Free)",
    keyPlaceholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
    docsInstructions:
      "1. Go to <strong>console.groq.com</strong><br>2. Sign up free<br>3. Click <strong>API Keys → Create</strong><br>4. Paste above.",
    models: [
      { value: "groq/llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { value: "groq/llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
      { value: "groq/compound", label: "Compound" },
      { value: "groq/compound-mini", label: "Compound Mini" },
      { value: "groq/qwen/qwen3-32b", label: "Qwen3 32B" },
      { value: "groq/moonshotai/kimi-k2-instruct-0905", label: "Kimi K2" },
      { value: "groq/openai/gpt-oss-120b", label: "GPT OSS 120B" },
      { value: "groq/openai/gpt-oss-20b", label: "GPT OSS 20B" },
    ],
    defaultModel: "groq/llama-3.3-70b-versatile",
    validateKey: (k: string) => k.startsWith("gsk_") && k.length > 20,
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    keyPlaceholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
    docsInstructions:
      "1. Go to <strong>platform.openai.com</strong><br>2. API Keys → Create<br>3. Paste above.",
    models: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    ],
    defaultModel: "gpt-4o-mini",
    validateKey: (k: string) => k.startsWith("sk-") && k.length > 20,
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    keyPlaceholder: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    docsInstructions:
      "1. Go to <strong>aistudio.google.com</strong><br>2. Get API Key<br>3. Paste above.",
    models: [
      { value: "gemini/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
      { value: "gemini/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
    defaultModel: "gemini/gemini-2.5-flash",
    validateKey: (k: string) => k.startsWith("AIza") && k.length > 20,
  },
} as const;

// ── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Create a BYOK instance for your project.
 *
 * @example
 * ```ts
 * import { createBYOK, PROVIDERS } from "@byok-lib/frontend";
 *
 * const byok = createBYOK({
 *   projectId: "my-app",
 *   providers: [PROVIDERS.groq],
 * });
 *
 * // On app startup — shows settings modal if no key saved yet
 * await byok.guardFirstRun();
 *
 * // In your own fetch calls — just spread the headers
 * const res = await fetch("/api/analyze", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json", ...byok.getHeaders() },
 *   body: JSON.stringify({ url: articleUrl }),
 * });
 * ```
 */
export function createBYOK(config: BYOKConfig) {
  const keyManager = new KeyManager(config.projectId);

  /** Open the settings modal programmatically. */
  function openSettings(options: {
    isFirstRun?: boolean;
    onSave?: (provider: string, key: string, model: string) => void;
    onCancel?: () => void;
  } = {}): SettingsUI {
    document.querySelector("byok-settings")?.remove();
    const modal = document.createElement("byok-settings") as SettingsUI;
    document.body.appendChild(modal);
    modal.init(config, keyManager, options);
    return modal;
  }


  function guardFirstRun(): Promise<boolean> {
    if (keyManager.isConfigured()) return Promise.resolve(true);

    return new Promise((resolve) => {
      openSettings({
        isFirstRun: true,
        onSave: () => resolve(false),
        onCancel: () => {
          setTimeout(() => guardFirstRun().then(resolve), 100);
        },
      });
    });
  }

  
  function getHeaders(): BYOKHeaders | null {
    const key = keyManager.getActiveKey();
    const provider = keyManager.getActiveProvider();
    const model = keyManager.getActiveModel();
    if (!key || !provider) return null;

    return {
      "X-BYOK-Api-Key": key,
      "X-BYOK-Provider": provider,
      "X-BYOK-Model": model ?? "",
    };
  }

  return {
    keyManager,
    openSettings,
    guardFirstRun,
    getHeaders,
  };
}
