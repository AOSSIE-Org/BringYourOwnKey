// ── Types ────────────────────────────────────────────────────────────────────

export interface ModelOption {
  value: string;
  label: string;
}

export interface Provider {
  id: string;
  label: string;
  keyPlaceholder: string;
  docsUrl: string;
  docsInstructions: string;
  models: ModelOption[];
  defaultModel: string;
  validateKey: (key: string) => boolean;
}

export interface BYOKConfig {
  projectId: string;
  providers: Provider[];
  accentColor?: string;
}

export interface StoredSettings {
  activeProvider: string;
  activeModel: string;
  keys: Record<string, string>;
}

/** The three headers the backend expects. */
export interface BYOKHeaders {
  "X-BYOK-Api-Key": string;
  "X-BYOK-Provider": string;
  "X-BYOK-Model": string;
}
