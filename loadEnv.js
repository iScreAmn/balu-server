import dotenv from "dotenv";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const pkgRoot = dirname(fileURLToPath(import.meta.url));

const TELEGRAM_KEYS = new Set([
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
]);

function injectTelegramFromFile(absPath) {
  if (!existsSync(absPath)) return;
  let text = readFileSync(absPath, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    let key = trimmed.slice(0, eq).replace(/^export\s+/i, "").trim();
    if (!TELEGRAM_KEYS.has(key)) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (val) process.env[key] = val;
  }
}

function loadFile(absPath, override) {
  if (!existsSync(absPath)) return;
  const r = dotenv.config({ path: absPath, override });
  if (r.error) {
    console.warn("[loadEnv] cannot read", absPath, ":", r.error.message);
  }
}

function collectEnvPaths() {
  const dirs = new Set([pkgRoot, process.cwd()]);
  dirs.add(join(process.cwd(), "balu-server"));
  const files = [];
  const seen = new Set();
  for (const dir of dirs) {
    for (const name of [".env", ".env.local"]) {
      const p = join(dir, name);
      if (seen.has(p) || !existsSync(p)) continue;
      seen.add(p);
      files.push(p);
    }
  }
  return files;
}

export function refreshTelegramEnv() {
  for (const p of collectEnvPaths()) {
    loadFile(p, true);
  }
  for (const p of collectEnvPaths()) {
    injectTelegramFromFile(p);
  }
}

refreshTelegramEnv();
