import * as path from "path";
import { realpath, stat } from "fs/promises";
import { isAllowed } from "./permissions";
import { getActiveProfile } from "./profiles";
import {
  MAX_FILE_SIZE,
  DANGEROUS_ENV_VARS,
  HOME_DIR,
  ENVRC_FILENAME,
} from "./constants";
import { ValidationError } from "./errors";

export interface EnvVars {
  [key: string]: string;
}

export async function safeReadFile(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const fileStats = await file.stat();
  if (fileStats.size > MAX_FILE_SIZE) {
    throw new ValidationError(
      `File too large: ${filePath} (${fileStats.size} bytes, max ${MAX_FILE_SIZE} bytes)`
    );
  }
  return file.text();
}

function interpolateVariables(vars: EnvVars): EnvVars {
  const resolved: EnvVars = {};
  const MAX_INTERPOLATION_DEPTH = 10;

  function resolve(key: string, visiting: Set<string>, depth: number = 0): string {
    const value = vars[key];
    if (!value) {
      return "";
    }

    // Detect max depth to prevent stack overflow
    if (depth > MAX_INTERPOLATION_DEPTH) {
      throw new ValidationError(
        `Variable interpolation depth exceeded for ${key} (max ${MAX_INTERPOLATION_DEPTH} levels)`
      );
    }

    // Detect circular references
    if (visiting.has(key)) {
      const chain = Array.from(visiting).join(" -> ") + " -> " + key;
      throw new ValidationError(`Circular variable reference detected: ${chain}`);
    }

    const newVisiting = new Set(visiting);
    newVisiting.add(key);

    // Replace all ${VAR} references with resolved values
    return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, varName) => {
      if (!vars.hasOwnProperty(varName)) {
        // Leave undefined variables as-is
        return match;
      }
      return resolve(varName, newVisiting, depth + 1);
    });
  }

  for (const key of Object.keys(vars)) {
    resolved[key] = resolve(key, new Set(), 0);
  }

  return resolved;
}

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

  // Apply variable interpolation
  return interpolateVariables(vars);
}

async function loadEnvFromDir(dirPath: string): Promise<EnvVars> {
  const vars: EnvVars = {};
  const envrcPath = path.join(dirPath, ENVRC_FILENAME);
  
  try {
    const exists = await Bun.file(envrcPath).exists();
    if (exists) {
      const allowed = await isAllowed(envrcPath);
      if (allowed) {
        const content = await safeReadFile(envrcPath);
        Object.assign(vars, parseEnvFile(content, envrcPath));
      }
    }
  } catch {
    // Continue on error
  }

  // Load active profile if set
  try {
    const activeProfile = await getActiveProfile(dirPath);
    if (activeProfile) {
      const profilePath = path.join(dirPath, `.envrc.${activeProfile}`);
      const profileExists = await Bun.file(profilePath).exists();
      
      if (profileExists) {
        const allowed = await isAllowed(profilePath);
        if (allowed) {
          const content = await safeReadFile(profilePath);
          const profileVars = parseEnvFile(content, profilePath);
          Object.assign(vars, profileVars);
        }
      }
    }
  } catch {
    // Continue on error if profile loading fails
  }

  return vars;
}

export async function loadEnvRecursive(startDir: string): Promise<EnvVars> {
  const vars: EnvVars = {};
  const home = HOME_DIR;
  
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
  const envrcPath = path.join(startDir, ENVRC_FILENAME);
  
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

  // Load active profile if set
  try {
    const activeProfile = await getActiveProfile(startDir);
    if (activeProfile) {
      const profilePath = path.join(startDir, `.envrc.${activeProfile}`);
      const profileExists = await Bun.file(profilePath).exists();
      
      if (profileExists) {
        const allowed = await isAllowed(profilePath);
        if (allowed) {
          const content = await safeReadFile(profilePath);
          const profileVars = parseEnvFile(content, profilePath);
          Object.assign(vars, profileVars);
        }
      }
    }
  } catch {
    // Continue on error if profile loading fails
  }

  return vars;
}
