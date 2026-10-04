import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("TypeScript compilation output contains dark mode styles and theme attributes", () => {
  const settingsJsPath = path.join(__dirname, "..", "dist", "SettingsUI.js");
  assert.ok(fs.existsSync(settingsJsPath), "SettingsUI.js should exist in dist");

  const content = fs.readFileSync(settingsJsPath, "utf-8");

  // Check dark mode CSS rules
  assert.ok(content.includes('--byok-bg: #1e293b'), "Should contain dark theme background variable");
  assert.ok(content.includes('--byok-text: #f8fafc'), "Should contain dark theme text variable");
  assert.ok(content.includes('--byok-input-bg: #0f172a'), "Should contain dark theme input background variable");
  assert.ok(content.includes(':host([data-theme="dark"])'), "Should support data-theme='dark' selector");
  assert.ok(content.includes('@media (prefers-color-scheme: dark)'), "Should support prefers-color-scheme media query");

  // Check data-theme attribute wiring in init()
  assert.ok(content.includes('setAttribute("data-theme"'), "Should set data-theme attribute on host");
  assert.ok(content.includes('removeAttribute("data-theme"'), "Should remove data-theme attribute when auto/light");
});

test("TypeScript declaration files export theme in BYOKConfig", () => {
  const typesDtsPath = path.join(__dirname, "..", "dist", "types.d.ts");
  assert.ok(fs.existsSync(typesDtsPath), "types.d.ts should exist in dist");

  const content = fs.readFileSync(typesDtsPath, "utf-8");
  assert.ok(
    content.includes('theme?: "light" | "dark" | "auto"'),
    "BYOKConfig should include theme property in declaration"
  );
});
