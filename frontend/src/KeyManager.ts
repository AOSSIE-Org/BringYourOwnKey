import type { StoredSettings } from "./types";

/**
 * Manages the user's BYOK settings in localStorage.
 *
 * Each project gets its own storage key via `projectId`, so multiple
 * apps on the same domain don't collide.
 */
export class KeyManager {
  private readonly storageKey: string;

  constructor(projectId: string) {
    this.storageKey = `byok_${projectId}`;
  }

  // ── Read ─────────────────────────────────────────────────────────────────

  private load(): Partial<StoredSettings> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private save(data: Partial<StoredSettings>): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  getActiveProvider(): string | null {
    return this.load().activeProvider ?? null;
  }

  getActiveModel(): string | null {
    return this.load().activeModel ?? null;
  }

  getKey(providerId: string): string | null {
    return this.load().keys?.[providerId] ?? null;
  }

  /** Returns the key for the currently active provider, or null. */
  getActiveKey(): string | null {
    const data = this.load();
    const provider = data.activeProvider;
    return provider ? (data.keys?.[provider] ?? null) : null;
  }

  isConfigured(): boolean {
    const data = this.load();
    const provider = data.activeProvider;
    return !!(provider && data.keys?.[provider]);
  }

  // ── Write ────────────────────────────────────────────────────────────────

  setActiveProvider(providerId: string): void {
    this.save({ ...this.load(), activeProvider: providerId });
  }

  setActiveModel(model: string): void {
    this.save({ ...this.load(), activeModel: model });
  }

  setKey(providerId: string, apiKey: string): void {
    const data = this.load();
    const keys = { ...(data.keys ?? {}), [providerId]: apiKey };
    this.save({ ...data, keys });
  }

  clearAll(): void {
    localStorage.removeItem(this.storageKey);
  }
}
