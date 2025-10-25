import * as path from "path";
import * as fs from "fs";
import { parseEnvFile, EnvVars } from "../loader";

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

async function safeReadEnvFile(filePath: string, description: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${description} file not found: ${filePath}`);
  }

  try {
    const file = Bun.file(filePath);
    const fileStats = await file.stat();
    if (fileStats.size > MAX_FILE_SIZE) {
      throw new Error(`${description} file too large: ${filePath} (${fileStats.size} bytes, max ${MAX_FILE_SIZE} bytes)`);
    }
    return await file.text();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Cannot read ${description} file: ${filePath} (${error.message})`);
    }
    throw error;
  }
}

export async function handleImport(args: string[]): Promise<void> {
  if (!args[0]) {
    throw new Error("Source file required. Usage: varset import <source> [target]");
  }

  const sourceFile = args[0];
  const targetFile = args[1] || path.join(process.cwd(), ".envrc");

  const sourceContent = await safeReadEnvFile(sourceFile, "Source");
  const sourceVars = parseEnvFile(sourceContent);

  // Read existing target file
  let existingVars: EnvVars = {};
  if (fs.existsSync(targetFile)) {
    const targetContent = await safeReadEnvFile(targetFile, "Target");
    existingVars = parseEnvFile(targetContent);
  }

  // Merge variables (source overwrites existing)
  const mergedVars = { ...existingVars, ...sourceVars };

  // Format and write to target file
  const lines = Object.entries(mergedVars).map(([key, value]) => {
    // Quote value if it contains spaces or special characters
    const needsQuotes = /[\s"'$]/.test(value);
    const quotedValue = needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value;
    return `${key}=${quotedValue}`;
  });

  const targetContent = lines.join("\n") + (lines.length > 0 ? "\n" : "");
  await Bun.write(targetFile, targetContent);

  const importedCount = Object.keys(sourceVars).length;
  console.log(`Imported ${importedCount} variables from ${sourceFile} to ${targetFile}`);
}
