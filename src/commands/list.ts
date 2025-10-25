import * as path from "path";
import * as fs from "fs";
import { loadPermissions } from "../permissions";
import { parseEnvFile, safeReadFile } from "../loader";
import { HOME_DIR } from "../constants";

interface FileStatus {
  path: string;
  displayPath: string;
  allowed: boolean;
  exists: boolean;
  variables: string[];
}

function formatPath(filePath: string): string {
  if (filePath.startsWith(HOME_DIR)) {
    return "~" + filePath.substring(HOME_DIR.length);
  }
  return filePath;
}

async function getFileStatus(filePath: string, allowed: boolean): Promise<FileStatus> {
  const exists = await Bun.file(filePath).exists();
  let variables: string[] = [];

  if (exists && allowed) {
    try {
      const content = await safeReadFile(filePath);
      const vars = parseEnvFile(content, filePath);
      variables = Object.keys(vars).sort();
    } catch {
      // If parsing fails, just leave variables empty
    }
  }

  return {
    path: filePath,
    displayPath: formatPath(filePath),
    allowed,
    exists,
    variables,
  };
}

export async function handleList(): Promise<void> {
  const perms = await loadPermissions();
  const entries = Object.entries(perms);

  if (entries.length === 0) {
    console.log("No .envrc files tracked yet.");
    console.log("Use 'varset allow <file>' to track .envrc files.");
    return;
  }

  const fileStatuses: FileStatus[] = [];

  // Get status for each tracked file
  for (const [filePath, entry] of entries) {
    const status = await getFileStatus(filePath, entry.allowed);
    fileStatuses.push(status);
  }

  // Separate into categories
  const active = fileStatuses.filter((s) => s.allowed && s.exists);
  const denied = fileStatuses.filter((s) => !s.allowed);
  const missing = fileStatuses.filter((s) => s.allowed && !s.exists);

  // Display active files
  if (active.length > 0) {
    console.log("\nActive .envrc files (loaded):");
    for (const file of active) {
      const varCount = file.variables.length;
      const varText = varCount === 1 ? "variable" : "variables";
      console.log(`  ${file.displayPath} (✓ allowed, ${varCount} ${varText})`);
      if (file.variables.length > 0) {
        for (const varName of file.variables) {
          console.log(`    - ${varName}`);
        }
      }
    }
  }

  // Display denied files
  if (denied.length > 0) {
    console.log("\nDenied .envrc files:");
    for (const file of denied) {
      const existsText = file.exists ? "" : " (file not found)";
      console.log(`  ${file.displayPath} (✗ denied)${existsText}`);
    }
  }

  // Display missing files
  if (missing.length > 0) {
    console.log("\nMissing .envrc files (stale):");
    for (const file of missing) {
      console.log(`  ${file.displayPath} (file not found)`);
    }
  }

  // Summary
  const totalVars = active.reduce((sum, f) => sum + f.variables.length, 0);
  const summary = [
    `${active.length} active`,
    `${denied.length} denied`,
    `${missing.length} missing`,
  ];

  console.log(`\nSummary: ${summary.join(", ")} (${totalVars} total variables loaded)`);
}
