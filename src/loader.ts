import * as path from "path";
import { realpath, stat } from "fs/promises";
import { isAllowed } from "./permissions";

export interface EnvVars {
  [key: string]: string;
}

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

async function safeReadFile(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const fileStats = await file.stat();
  if (fileStats.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${filePath} (${fileStats.size} bytes, max ${MAX_FILE_SIZE} bytes)`);
  }
  return file.text();
}

// Environment variables that could be abused for code injection/hijacking
const DANGEROUS_ENV_VARS = new Set([
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "LD_AUDIT",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "DYLD_PRELOAD",
  "ASAN_PRELOAD",
  "UBSAN_PRELOAD",
  "PATH",
  "PYTHONPATH",
  "RUBYLIB",
]);

export function parseEnvFile(content: string, filePath?: string): EnvVars {
  const vars: EnvVars = {};
  const lines = content.split("\n");
  const dangerous: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    let cleanLine = trimmed;
    if (cleanLine.startsWith("export ")) {
      cleanLine = cleanLine.substring(7);
    }

    const eqIndex = cleanLine.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    const key = cleanLine.substring(0, eqIndex).trim();
    let value = cleanLine.substring(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      if (DANGEROUS_ENV_VARS.has(key)) {
        dangerous.push(key);
      } else {
        vars[key] = value;
      }
    }
  }

  if (dangerous.length > 0) {
    console.warn(`⚠ Warning: .envrc at ${filePath || "unknown"} contains restricted variables and they were ignored: ${dangerous.join(", ")}`);
  }

  return vars;
}

async function loadEnvFromDir(dirPath: string): Promise<EnvVars> {
  const envrcPath = path.join(dirPath, ".envrc");
  
  try {
    const exists = await Bun.file(envrcPath).exists();
    if (!exists) {
      return {};
    }

    const allowed = await isAllowed(envrcPath);
    if (!allowed) {
      return {};
    }

    const content = await safeReadFile(envrcPath);
    return parseEnvFile(content, envrcPath);
  } catch {
    return {};
  }
}

export async function loadEnvRecursive(startDir: string): Promise<EnvVars> {
  const vars: EnvVars = {};
  const home = process.env.HOME || "/root";
  
  let currentDir: string;
  try {
    currentDir = await realpath(startDir);
  } catch {
    currentDir = path.resolve(startDir);
  }

  // Collect all directories from current to home, tracking inodes to detect symlink loops
  const dirs: string[] = [];
  const visitedInodes = new Set<number>();

  while (true) {
    try {
      const st = await stat(currentDir);
      if (visitedInodes.has(st.ino)) {
        break;
      }
      visitedInodes.add(st.ino);
    } catch {
      break;
    }

    dirs.push(currentDir);

    if (currentDir === home || currentDir === "/") {
      break;
    }

    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      break;
    }

    try {
      currentDir = await realpath(parent);
    } catch {
      currentDir = parent;
    }
  }

  // Load from home first (or root), then down to current dir
  // This way child vars override parent vars
  for (let i = dirs.length - 1; i >= 0; i--) {
    const dirVars = await loadEnvFromDir(dirs[i]);
    Object.assign(vars, dirVars);
  }

  return vars;
}

export async function loadEnvFromDirDown(startDir: string): Promise<EnvVars> {
  const vars: EnvVars = {};
  const envrcPath = path.join(startDir, ".envrc");
  
  try {
    const exists = await Bun.file(envrcPath).exists();
    if (exists) {
      const allowed = await isAllowed(envrcPath);
      if (allowed) {
        const content = await safeReadFile(envrcPath);
        const dirVars = parseEnvFile(content, envrcPath);
        Object.assign(vars, dirVars);
      }
    }
  } catch {
    // Continue on error
  }

  return vars;
}
