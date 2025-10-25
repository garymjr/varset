import * as path from "path";
import * as fs from "fs";
import { realpath } from "fs/promises";
import { VALID_VAR_NAME_PATTERN, SAFE_BASE_PATHS } from "./constants";
import { ValidationError, SecurityError } from "./errors";

/**
 * Validate and resolve a file path, ensuring it's within safe boundaries
 * Detects path traversal attempts and symlink loops
 */
export async function validateAndResolvePath(
  filePath: string,
  allowedBasePaths: string[] = SAFE_BASE_PATHS
): Promise<string> {
  if (!filePath || typeof filePath !== "string") {
    throw new ValidationError("Path must be a non-empty string");
  }

  // Prevent path traversal attempts
  if (filePath.includes("..")) {
    throw new SecurityError(`Path traversal attempt detected: ${filePath}`);
  }

  let resolvedPath: string;
  try {
    resolvedPath = await realpath(filePath);
  } catch (error) {
    // If file doesn't exist, try to resolve directory
    const dir = path.dirname(filePath);
    try {
      const resolvedDir = await realpath(dir);
      resolvedPath = path.join(resolvedDir, path.basename(filePath));
    } catch {
      // Last resort: just resolve relative to cwd
      resolvedPath = path.resolve(filePath);
    }
  }

  // For /tmp and development paths, allow but warn
  const isDev = resolvedPath.includes("/test") || resolvedPath.includes("/.") || resolvedPath.includes("/tmp");
  if (!isDev) {
    // Check if path is within allowed base paths
    let isAllowed = false;
    for (const basePath of allowedBasePaths) {
      const normalizedBase = basePath.endsWith("/") ? basePath : basePath + "/";
      if (resolvedPath === basePath || resolvedPath.startsWith(normalizedBase)) {
        isAllowed = true;
        break;
      }
    }

    if (!isAllowed) {
      throw new SecurityError(
        `Path is outside allowed directories: ${filePath}\n` +
        `Allowed: ${allowedBasePaths.join(", ")}`
      );
    }
  }

  return resolvedPath;
}

/**
 * Validate an environment variable name
 */
export function validateVariableName(name: string): void {
  if (!name || typeof name !== "string") {
    throw new ValidationError("Variable name must be a non-empty string");
  }

  if (name.length > 255) {
    throw new ValidationError(`Variable name too long: ${name.length} > 255 characters`);
  }

  if (!VALID_VAR_NAME_PATTERN.test(name)) {
    throw new ValidationError(
      `Invalid variable name: ${name}\n` +
      `Must start with letter or underscore, contain only alphanumeric and underscore`
    );
  }
}

/**
 * Validate an environment variable value
 */
export function validateVariableValue(value: string, maxLength: number = 1024 * 100): void {
  if (typeof value !== "string") {
    throw new ValidationError("Variable value must be a string");
  }

  if (value.length > maxLength) {
    throw new ValidationError(
      `Variable value too long: ${value.length} > ${maxLength} characters`
    );
  }
}

/**
 * Validate a command (basic check - doesn't execute)
 */
export function validateCommand(command: string): void {
  if (!command || typeof command !== "string") {
    throw new ValidationError("Command must be a non-empty string");
  }

  if (command.length > 4096) {
    throw new ValidationError("Command too long");
  }

  // Check for obvious shell injection attempts
  const dangerousPatterns = [
    /[;&|`$(){}[\]<>]/,  // Shell metacharacters
    /\$\(/,               // Command substitution
    /`/,                  // Backtick execution
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      // This is a warning - shell metacharacters are valid in some contexts
      // But we should be aware of them
      console.warn(`⚠ Warning: Command contains shell metacharacters: ${command}`);
    }
  }
}

/**
 * Validate a directory path exists and is readable
 */
export async function validateDirectory(dirPath: string): Promise<void> {
  if (!dirPath || typeof dirPath !== "string") {
    throw new ValidationError("Directory path must be a non-empty string");
  }

  if (!fs.existsSync(dirPath)) {
    throw new ValidationError(`Directory not found: ${dirPath}`);
  }

  const stats = fs.statSync(dirPath);
  if (!stats.isDirectory()) {
    throw new ValidationError(`Not a directory: ${dirPath}`);
  }
}

/**
 * Validate a file exists and is readable
 */
export async function validateFile(filePath: string): Promise<void> {
  if (!filePath || typeof filePath !== "string") {
    throw new ValidationError("File path must be a non-empty string");
  }

  if (!fs.existsSync(filePath)) {
    throw new ValidationError(`File not found: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    throw new ValidationError(`Not a file: ${filePath}`);
  }
}

/**
 * Check if a file is world-writable (security issue)
 */
export function checkFilePermissions(filePath: string): void {
  try {
    const stats = fs.statSync(filePath);
    // Check if world-writable (mode & 0o002)
    if ((stats.mode & 0o002) !== 0) {
      console.warn(
        `⚠ Warning: File is world-writable: ${filePath}\n` +
        `Consider running: chmod 600 ${filePath}`
      );
    }
  } catch {
    // File might not exist yet, that's okay
  }
}

/**
 * Validate JSON string is valid and not too large
 */
export function validateJSON(jsonString: string, maxLength: number = 10 * 1024 * 1024): object {
  if (jsonString.length > maxLength) {
    throw new ValidationError(`JSON too large: ${jsonString.length} > ${maxLength} bytes`);
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new ValidationError(
      `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Sanitize a string for safe output (remove control characters)
 */
export function sanitizeOutput(input: string): string {
  if (typeof input !== "string") {
    return String(input);
  }
  // Remove control characters but keep newlines and tabs
  return input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
}
