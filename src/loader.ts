import * as path from "path";
import { realpath } from "fs/promises";
import { isAllowed } from "./permissions";

export interface EnvVars {
  [key: string]: string;
}

export function parseEnvFile(content: string): EnvVars {
  const vars: EnvVars = {};
  const lines = content.split("\n");

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
      vars[key] = value;
    }
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

    const content = await Bun.file(envrcPath).text();
    return parseEnvFile(content);
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

  // Collect all directories from current to home
  const dirs: string[] = [];
  const visited = new Set<string>();

  while (true) {
    if (visited.has(currentDir)) {
      break;
    }
    visited.add(currentDir);
    dirs.push(currentDir);

    if (currentDir === home || currentDir === "/") {
      break;
    }

    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      break;
    }

    currentDir = parent;
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
        const content = await Bun.file(envrcPath).text();
        const dirVars = parseEnvFile(content);
        Object.assign(vars, dirVars);
      }
    }
  } catch {
    // Continue on error
  }

  return vars;
}
