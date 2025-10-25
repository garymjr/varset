import * as path from "path";
import * as fs from "fs";
import { parseEnvFile, EnvVars } from "../loader";

export async function handleImport(args: string[]): Promise<void> {
  if (!args[0]) {
    throw new Error("Source file required. Usage: varset import <source> [target]");
  }

  const sourceFile = args[0];
  const targetFile = args[1] || path.join(process.cwd(), ".envrc");

  // Read source file
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Source file not found: ${sourceFile}`);
  }

  const sourceContent = await Bun.file(sourceFile).text();
  const sourceVars = parseEnvFile(sourceContent);

  // Read existing target file
  let existingVars: EnvVars = {};
  if (fs.existsSync(targetFile)) {
    const targetContent = await Bun.file(targetFile).text();
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
