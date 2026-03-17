import type { BYOKConfig, Provider } from "./types";
import { KeyManager } from "./KeyManager";

// ── Styles ───────────────────────────────────────────────────────────────────

const buildStyles = (accent: string) => `
  :host { all: initial; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    font-family: system-ui, -apple-system, sans-serif;
    backdrop-filter: blur(2px);
  }

  .modal {
    background: #fff; border-radius: 14px; width: 460px;
    max-width: 95vw; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    animation: pop .2s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes pop {
    from { transform: scale(.9) translateY(10px); opacity: 0; }
    to   { transform: scale(1) translateY(0); opacity: 1; }
  }

  .header { padding: 22px 24px 0; }
  .header h2 { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
  .header p  { margin-top: 4px; font-size: .8rem; color: #64748b; }

  .body { padding: 18px 24px 24px; }

  .first-run {
    background: linear-gradient(135deg, #eff6ff, #f0fdf4);
    border: 1px solid #bfdbfe; border-radius: 10px;
    padding: 12px 14px; font-size: .8rem; color: #1e40af;
    margin-bottom: 18px; line-height: 1.5;
  }

  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: .72rem; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }

  select, input {
    width: 100%; padding: 9px 12px; border: 1.5px solid #e2e8f0;
    border-radius: 9px; font-size: .85rem; color: #0f172a;
    background: #f8fafc; outline: none;
    transition: border-color .15s, box-shadow .15s;
  }
  select:focus, input:focus { border-color: ${accent}; box-shadow: 0 0 0 3px ${accent}22; background: #fff; }
  input { font-family: "SF Mono", "Fira Code", monospace; }

  .instructions {
    margin-top: 10px; padding: 10px 14px;
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
    font-size: .78rem; color: #475569; line-height: 1.5;
  }
  .instructions a { color: ${accent}; text-decoration: none; font-weight: 600; }
  .instructions a:hover { text-decoration: underline; }

  .error { color: #dc2626; font-size: .78rem; margin-top: 6px; }

  .actions { display: flex; gap: 10px; margin-top: 20px; }
  .actions button {
    flex: 1; padding: 10px; border-radius: 9px; font-size: .85rem;
    font-weight: 600; cursor: pointer; transition: all .15s; border: none;
  }
  .btn-cancel { background: #f1f5f9; color: #475569; }
  .btn-cancel:hover { background: #e2e8f0; }
  .btn-save { background: ${accent}; color: #fff; }
  .btn-save:hover { filter: brightness(1.1); }

  .saved { text-align: center; color: #16a34a; font-weight: 600; padding: 8px 0; }
`;

// ── Web Component ────────────────────────────────────────────────────────────

export class SettingsUI extends HTMLElement {
  private root!: ShadowRoot;
  private config!: BYOKConfig;
  private keyManager!: KeyManager;
  private onSave?: (provider: string, key: string, model: string) => void;
  private onCancel?: () => void;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }

  init(
    config: BYOKConfig,
    keyManager: KeyManager,
    options: {
      isFirstRun?: boolean;
      onSave?: (provider: string, key: string, model: string) => void;
      onCancel?: () => void;
    } = {}
  ) {
    this.config = config;
    this.keyManager = keyManager;
    this.onSave = options.onSave;
    this.onCancel = options.onCancel;

    const accent = config.accentColor ?? "#6366f1";
    const providers = config.providers;
    const savedProvider = keyManager.getActiveProvider() ?? providers[0]?.id ?? "";
    const savedModel = keyManager.getActiveModel() ?? "";

    this.root.innerHTML = `
      <style>${buildStyles(accent)}</style>
      <div class="overlay">
        <div class="modal">
          <div class="header">
            <h2>⚙️ API Settings</h2>
            <p>Enter your API key to use AI features. Your key stays in this browser.</p>
          </div>
          <div class="body">
            ${options.isFirstRun ? `<div class="first-run">👋 <strong>Welcome!</strong> You need an API key to get started. Pick a provider and paste your key below.</div>` : ""}

            <div class="field">
              <label>Provider</label>
              <select id="provider-select">
                ${providers.map((p) => `<option value="${p.id}" ${p.id === savedProvider ? "selected" : ""}>${p.label}</option>`).join("")}
              </select>
            </div>

            <div class="field">
              <label>Model</label>
              <select id="model-select"></select>
            </div>

            <div class="field">
              <label>API Key</label>
              <input id="key-input" type="password" />
              <div class="instructions" id="instructions"></div>
            </div>

            <div class="error" id="error" style="display:none"></div>
            <div class="saved" id="saved" style="display:none">✓ Saved!</div>

            <div class="actions">
              <button class="btn-cancel" id="btn-cancel">Cancel</button>
              <button class="btn-save" id="btn-save">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wire up events
    const providerSelect = this.root.getElementById("provider-select") as HTMLSelectElement;
    const modelSelect = this.root.getElementById("model-select") as HTMLSelectElement;
    const keyInput = this.root.getElementById("key-input") as HTMLInputElement;
    const instructions = this.root.getElementById("instructions") as HTMLDivElement;
    const errorEl = this.root.getElementById("error") as HTMLDivElement;
    const savedEl = this.root.getElementById("saved") as HTMLDivElement;

    const updateForProvider = (providerId: string) => {
      const p = providers.find((x) => x.id === providerId);
      if (!p) return;
      modelSelect.innerHTML = p.models
        .map((m) => `<option value="${m.value}" ${m.value === (savedModel || p.defaultModel) ? "selected" : ""}>${m.label}</option>`)
        .join("");
      keyInput.placeholder = p.keyPlaceholder;
      keyInput.value = keyManager.getKey(providerId) ?? "";
      instructions.innerHTML = `<a href="${p.docsUrl}" target="_blank" rel="noopener">Get a key →</a><br>${p.docsInstructions}`;
      errorEl.style.display = "none";
    };

    updateForProvider(providerSelect.value);

    providerSelect.addEventListener("change", () => updateForProvider(providerSelect.value));

    this.root.getElementById("btn-cancel")!.addEventListener("click", () => {
      this.remove();
      this.onCancel?.();
    });

    this.root.querySelector(".overlay")!.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        this.remove();
        this.onCancel?.();
      }
    });

    this.root.getElementById("btn-save")!.addEventListener("click", () => {
      const providerId = providerSelect.value;
      const p = providers.find((x) => x.id === providerId)!;
      const key = keyInput.value.trim();
      const model = modelSelect.value;

      if (!key) {
        errorEl.textContent = "Please enter an API key.";
        errorEl.style.display = "block";
        return;
      }
      if (!p.validateKey(key)) {
        errorEl.textContent = `That doesn't look like a valid ${p.label} key. Please check and try again.`;
        errorEl.style.display = "block";
        return;
      }

      errorEl.style.display = "none";
      keyManager.setKey(providerId, key);
      keyManager.setActiveProvider(providerId);
      keyManager.setActiveModel(model);

      savedEl.style.display = "block";
      setTimeout(() => {
        savedEl.style.display = "none";
        this.remove();
        this.onSave?.(providerId, key, model);
      }, 800);
    });
  }
}

// Register the custom element
if (typeof customElements !== "undefined" && !customElements.get("byok-settings")) {
  customElements.define("byok-settings", SettingsUI);
}
