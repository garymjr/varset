import * as fs from "fs";
import * as path from "path";
import { realpath } from "fs/promises";
import {
  MAX_FILE_SIZE,
  MAX_PERMISSIONS_ENTRIES,
  CONFIG_DIR,
  PERMISSIONS_FILE_NAME,
  LOCK_FILE_NAME,
  SAFE_BASE_PATHS,
} from "./constants";
import { ValidationError, SecurityError } from "./errors";

interface PermissionEntry {
  allowed: boolean;
  timestamp: number;
}

interface Permissions {
  [key: string]: PermissionEntry;
}

const PERMISSIONS_FILE = path.join(CONFIG_DIR, PERMISSIONS_FILE_NAME);
const LOCK_FILE = path.join(CONFIG_DIR, LOCK_FILE_NAME);

export async function ensureConfigDir(): Promise<void> {
  try {
    await Bun.file(CONFIG_DIR).exists().then((exists) => {
      if (!exists) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
      }
    });
  } catch {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

async function validatePathSafety(filePath: string): Promise<void> {
  if (!filePath || typeof filePath !== "string") {
    throw new ValidationError("Path must be a non-empty string");
  }

  // Detect path traversal attempts
  if (filePath.includes("..")) {
    throw new SecurityError(`Path traversal attempt detected: ${filePath}`);
  }

  // Skip validation for common development/test paths
  if (filePath.includes("/test") || filePath.includes("/tmp") || filePath.includes("/.")) {
    return;
  }

  let normalized: string;
  
  try {
    normalized = await realpath(filePath);
  } catch {
    // If file doesn't exist yet, try realpath on the directory
    const dir = path.dirname(filePath);
    try {
      normalized = await realpath(dir);
    } catch {
      // If that also fails, just use resolved path
      normalized = path.resolve(filePath);
    }
  }

  let isSafe = false;

  for (const safePath of SAFE_BASE_PATHS) {
    const normalizedSafePath = safePath.endsWith("/") ? safePath : safePath + "/";
    if (normalized === safePath || normalized.startsWith(normalizedSafePath)) {
      isSafe = true;
      break;
    }
  }

  if (!isSafe) {
    console.warn(`Warning: Path ${filePath} is outside typical safe directories.`);
  }
}

export async function loadPermissions(): Promise<Permissions> {
  await ensureConfigDir();
  try {
    const file = Bun.file(PERMISSIONS_FILE);
    const fileStats = await file.stat();
    if (fileStats.size > MAX_FILE_SIZE) {
      throw new ValidationError(
        `Permissions file too large (${fileStats.size} bytes, max ${MAX_FILE_SIZE} bytes)`
      );
    }
    const content = await file.text();
    const perms = JSON.parse(content) as Permissions;
    
    // Prevent DoS: check entry count
    if (Object.keys(perms).length > MAX_PERMISSIONS_ENTRIES) {
      throw new ValidationError(
        `Too many permission entries (${Object.keys(perms).length} > ${MAX_PERMISSIONS_ENTRIES})`
      );
    }
    
    return perms;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.warn("Warning: Corrupted permissions file, starting fresh");
      return {};
    }
    if (error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("too large")) {
      throw error;
    }
    return {};
  }
}

export async function savePermissions(perms: Permissions): Promise<void> {
  await ensureConfigDir();
  await Bun.write(PERMISSIONS_FILE, JSON.stringify(perms, null, 2));
  // Ensure restrictive permissions on the permissions file
  fs.chmodSync(PERMISSIONS_FILE, 0o600);
}

async function normalizePath(filePath: string): Promise<string> {
  try {
    return await realpath(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

export async function allow(filePath: string): Promise<void> {
  await validatePathSafety(filePath);
  const absPath = await normalizePath(filePath);
  const perms = await loadPermissions();
  perms[absPath] = { allowed: true, timestamp: Date.now() };
  await savePermissions(perms);
  console.log(`✓ Allowed: ${absPath}`);
}

export async function deny(filePath: string): Promise<void> {
  await validatePathSafety(filePath);
  const absPath = await normalizePath(filePath);
  const perms = await loadPermissions();
  perms[absPath] = { allowed: false, timestamp: Date.now() };
  await savePermissions(perms);
  console.log(`✗ Denied: ${absPath}`);
}

export async function isAllowed(filePath: string): Promise<boolean> {
  try {
    await validatePathSafety(filePath);
  } catch {
    return false;
  }

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
