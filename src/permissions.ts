import * as fs from "fs";
import * as path from "path";
import { realpath } from "fs/promises";

interface PermissionEntry {
  allowed: boolean;
  timestamp: number;
}

interface Permissions {
  [key: string]: PermissionEntry;
}

const CONFIG_DIR = path.join(process.env.HOME || "/root", ".config/varset");
const PERMISSIONS_FILE = path.join(CONFIG_DIR, "allowed.json");

export async function ensureConfigDir(): Promise<void> {
  try {
    await Bun.file(CONFIG_DIR).exists().then((exists) => {
      if (!exists) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
    });
  } catch {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export async function loadPermissions(): Promise<Permissions> {
  await ensureConfigDir();
  try {
    const content = await Bun.file(PERMISSIONS_FILE).text();
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export async function savePermissions(perms: Permissions): Promise<void> {
  await ensureConfigDir();
  await Bun.write(PERMISSIONS_FILE, JSON.stringify(perms, null, 2));
}

async function normalizePath(filePath: string): Promise<string> {
  try {
    return await realpath(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

export async function allow(filePath: string): Promise<void> {
  const absPath = await normalizePath(filePath);
  const perms = await loadPermissions();
  perms[absPath] = { allowed: true, timestamp: Date.now() };
  await savePermissions(perms);
  console.log(`✓ Allowed: ${absPath}`);
}

export async function deny(filePath: string): Promise<void> {
  const absPath = await normalizePath(filePath);
  const perms = await loadPermissions();
  perms[absPath] = { allowed: false, timestamp: Date.now() };
  await savePermissions(perms);
  console.log(`✗ Denied: ${absPath}`);
}

export async function isAllowed(filePath: string): Promise<boolean> {
  const absPath = await normalizePath(filePath);
  const perms = await loadPermissions();
  const entry = perms[absPath];
  
  if (!entry) {
    return false;
  }
  
  return entry.allowed === true;
}

export async function prune(): Promise<void> {
  const perms = await loadPermissions();
  const entries = Object.keys(perms);
  let removed = 0;

  for (const filePath of entries) {
    try {
      const exists = await Bun.file(filePath).exists();
      if (!exists) {
        delete perms[filePath];
        removed++;
      }
    } catch {
      delete perms[filePath];
      removed++;
    }
  }

  if (removed > 0) {
    await savePermissions(perms);
    console.log(`Pruned ${removed} stale entries`);
  } else {
    console.log("No stale entries to prune");
  }
}
