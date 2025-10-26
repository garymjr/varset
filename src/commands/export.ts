import { loadEnvRecursive, EnvVars } from "../loader";
import { ValidationError } from "../errors";

type ExportFormat = "dotenv" | "json" | "yaml" | "shell";

function formatDotenv(vars: EnvVars): string {
  const lines = Object.entries(vars).map(([key, value]) => {
    const needsQuotes = /[\s"'$\\]/.test(value);
    const quotedValue = needsQuotes ? `"${value.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"` : value;
    return `${key}=${quotedValue}`;
  });

  return lines.join("\n") + (lines.length > 0 ? "\n" : "");
}

function formatJson(vars: EnvVars): string {
  return JSON.stringify(vars, null, 2) + "\n";
}

function formatYaml(vars: EnvVars): string {
  const lines = Object.entries(vars).map(([key, value]) => {
    const needsQuotes = /[:\n"']/.test(value) || value.startsWith(" ") || value.endsWith(" ");
    const quotedValue = needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value;
    return `${key}: ${quotedValue}`;
  });

  return lines.join("\n") + (lines.length > 0 ? "\n" : "");
}

function formatShell(vars: EnvVars): string {
  const lines = Object.entries(vars).map(([key, value]) => {
    const escapedValue = value.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
    return `export ${key}="${escapedValue}"`;
  });

  return lines.join("\n") + (lines.length > 0 ? "\n" : "");
}

function parseFormatFlag(args: string[]): ExportFormat {
  const formatArg = args.find((arg) => arg.startsWith("--format="));
  if (!formatArg) {
    return "dotenv";
  }

  const format = formatArg.split("=")[1]?.toLowerCase();
  if (!format || !["dotenv", "json", "yaml", "shell"].includes(format)) {
    throw new ValidationError(`Invalid format: ${format}. Supported formats: dotenv, json, yaml, shell`);
  }

  return format as ExportFormat;
}

export async function handleExport(args: string[]): Promise<void> {
  const format = parseFormatFlag(args);
  const vars = await loadEnvRecursive(process.cwd());

  let output: string;
  switch (format) {
    case "json":
      output = formatJson(vars);
      break;
    case "yaml":
      output = formatYaml(vars);
      break;
    case "shell":
      output = formatShell(vars);
      break;
    case "dotenv":
    default:
      output = formatDotenv(vars);
  }

  process.stdout.write(output);
}
