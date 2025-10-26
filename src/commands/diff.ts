import * as path from "path";
import { parseEnvFile, loadEnvRecursive } from "../loader";
import { isAllowed } from "../permissions";
import { ValidationError } from "../errors";

interface DiffResult {
  added: Record<string, string>;
  removed: Record<string, string>;
  modified: Record<string, { before: string; after: string }>;
  unchanged: Record<string, string>;
}

const COLORS = {
  GREEN: "\x1b[32m",
  RED: "\x1b[31m",
  YELLOW: "\x1b[33m",
  GRAY: "\x1b[90m",
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
};

function compareDiffs(before: Record<string, string>, after: Record<string, string>): DiffResult {
  const result: DiffResult = {
    added: {},
    removed: {},
    modified: {},
    unchanged: {},
  };

  // Find removed and modified
  for (const [key, value] of Object.entries(before)) {
    if (!(key in after)) {
      result.removed[key] = value;
    } else if (after[key] !== value) {
      result.modified[key] = { before: value, after: after[key] };
    } else {
      result.unchanged[key] = value;
    }
  }

  // Find added
  for (const [key, value] of Object.entries(after)) {
    if (!(key in before)) {
      result.added[key] = value;
    }
  }

  return result;
}

function formatDiff(diff: DiffResult, showUnchanged: boolean = false): string {
  const lines: string[] = [];

  if (Object.keys(diff.added).length > 0) {
    lines.push(`${COLORS.GREEN}${COLORS.BOLD}Added variables:${COLORS.RESET}`);
    for (const [key, value] of Object.entries(diff.added)) {
      lines.push(`${COLORS.GREEN}+ ${key}=${formatValue(value)}${COLORS.RESET}`);
    }
    lines.push("");
  }

  if (Object.keys(diff.removed).length > 0) {
    lines.push(`${COLORS.RED}${COLORS.BOLD}Removed variables:${COLORS.RESET}`);
    for (const [key, value] of Object.entries(diff.removed)) {
      lines.push(`${COLORS.RED}- ${key}=${formatValue(value)}${COLORS.RESET}`);
    }
    lines.push("");
  }

  if (Object.keys(diff.modified).length > 0) {
    lines.push(`${COLORS.YELLOW}${COLORS.BOLD}Modified variables:${COLORS.RESET}`);
    for (const [key, { before, after }] of Object.entries(diff.modified)) {
      lines.push(`${COLORS.YELLOW}~ ${key}${COLORS.RESET}`);
      lines.push(`${COLORS.RED}  - ${formatValue(before)}${COLORS.RESET}`);
      lines.push(`${COLORS.GREEN}  + ${formatValue(after)}${COLORS.RESET}`);
    }
    lines.push("");
  }

  if (showUnchanged && Object.keys(diff.unchanged).length > 0) {
    lines.push(`${COLORS.GRAY}${COLORS.BOLD}Unchanged variables:${COLORS.RESET}`);
    for (const [key, value] of Object.entries(diff.unchanged)) {
      lines.push(`${COLORS.GRAY}  ${key}=${formatValue(value)}${COLORS.RESET}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatValue(value: string): string {
  if (value.length > 50) {
    return `"${value.substring(0, 47)}..."`;
  }
  return `"${value}"`;
}

function printSummary(diff: DiffResult): void {
  const added = Object.keys(diff.added).length;
  const removed = Object.keys(diff.removed).length;
  const modified = Object.keys(diff.modified).length;
  const total = added + removed + modified;

  console.log(`\n${COLORS.BOLD}Summary:${COLORS.RESET}`);
  if (added > 0) {
    console.log(`${COLORS.GREEN}  ${added} added${COLORS.RESET}`);
  }
  if (removed > 0) {
    console.log(`${COLORS.RED}  ${removed} removed${COLORS.RESET}`);
  }
  if (modified > 0) {
    console.log(`${COLORS.YELLOW}  ${modified} modified${COLORS.RESET}`);
  }
  if (total === 0) {
    console.log(`${COLORS.GRAY}  No changes${COLORS.RESET}`);
  }
}

async function readEnvFile(filePath: string): Promise<Record<string, string>> {
  const file = Bun.file(filePath);
  const exists = await file.exists();
  
  if (!exists) {
    throw new ValidationError(`File not found: ${filePath}`);
  }

  try {
    const content = await file.text();
    return parseEnvFile(content, filePath);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Failed to parse ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function handleDiff(args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new ValidationError("Usage: varset diff <file1> <file2> or varset diff --preview [directory]");
  }

  // Preview mode
  if (args[0] === "--preview") {
    const targetDir = args[1] || process.cwd();
    
    try {
      const before = await loadEnvRecursive(process.cwd());
      const after = await loadEnvRecursive(targetDir);

      const diff = compareDiffs(before, after);
      
      console.log(`\n${COLORS.BOLD}Variable changes when entering: ${targetDir}${COLORS.RESET}\n`);
      console.log(formatDiff(diff, false));
      printSummary(diff);
    } catch (error) {
      throw new ValidationError(
        `Failed to preview directory ${targetDir}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
    return;
  }

  // File comparison mode
  if (args.length < 2) {
    throw new ValidationError("Usage: varset diff <file1> <file2>");
  }

  const file1 = path.resolve(args[0]);
  const file2 = path.resolve(args[1]);

  try {
    const vars1 = await readEnvFile(file1);
    const vars2 = await readEnvFile(file2);

    const diff = compareDiffs(vars1, vars2);

    console.log(`\n${COLORS.BOLD}Comparing: ${file1}${COLORS.RESET}`);
    console.log(`${COLORS.BOLD}       vs: ${file2}${COLORS.RESET}\n`);
    console.log(formatDiff(diff, false));
    printSummary(diff);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      `Failed to compare files: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
