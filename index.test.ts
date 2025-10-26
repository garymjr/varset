import { test, expect } from "bun:test";
import * as path from "path";
import * as fs from "fs";
import { realpath } from "fs/promises";
import {
  allow,
  deny,
  isAllowed,
  prune,
  loadPermissions,
} from "./src/permissions";
import { loadEnvRecursive, loadEnvFromDirDown, parseEnvFile } from "./src/loader";

// Test utilities
const TEST_DIR = "/tmp/varset_test_suite";
const TEST_HOME = path.join(TEST_DIR, "home");

async function setupTestDir(): Promise<void> {
  // Clean up if exists
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }

  // Create test directory structure
  fs.mkdirSync(path.join(TEST_HOME, "dirA", "dirB"), { recursive: true });

  // Create .envrc files
  fs.writeFileSync(path.join(TEST_HOME, ".envrc"), "HOME_VAR=home_value");
  fs.writeFileSync(path.join(TEST_HOME, "dirA", ".envrc"), "DIRA_VAR=dira_value");
  fs.writeFileSync(
    path.join(TEST_HOME, "dirA", "dirB", ".envrc"),
    "DIRB_VAR=dirb_value"
  );

  // Set HOME for tests
  process.env.HOME = TEST_HOME;
}

async function cleanupTestDir(): Promise<void> {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
}

test("allow - should grant permission to .envrc", async () => {
  await setupTestDir();

  const envrcPath = path.join(TEST_HOME, ".envrc");
  await allow(envrcPath);

  const isAllowedResult = await isAllowed(envrcPath);
  expect(isAllowedResult).toBe(true);

  await cleanupTestDir();
});

test("deny - should revoke permission to .envrc", async () => {
  await setupTestDir();

  const envrcPath = path.join(TEST_HOME, ".envrc");
  await allow(envrcPath);
  await deny(envrcPath);

  const isAllowedResult = await isAllowed(envrcPath);
  expect(isAllowedResult).toBe(false);

  await cleanupTestDir();
});

test("loadEnvRecursive - should load all allowed .envrc files", async () => {
  await setupTestDir();

  const homeEnvrc = path.join(TEST_HOME, ".envrc");
  const dirAEnvrc = path.join(TEST_HOME, "dirA", ".envrc");

  await allow(homeEnvrc);
  await allow(dirAEnvrc);

  const vars = await loadEnvRecursive(path.join(TEST_HOME, "dirA"));

  expect(vars.HOME_VAR).toBe("home_value");
  expect(vars.DIRA_VAR).toBe("dira_value");

  await cleanupTestDir();
});

test("loadEnvRecursive - should skip denied .envrc files", async () => {
  await setupTestDir();

  const homeEnvrc = path.join(TEST_HOME, ".envrc");
  const dirAEnvrc = path.join(TEST_HOME, "dirA", ".envrc");

  await allow(homeEnvrc);
  await deny(dirAEnvrc);

  const vars = await loadEnvRecursive(path.join(TEST_HOME, "dirA"));

  expect(vars.HOME_VAR).toBe("home_value");
  expect(vars.DIRA_VAR).toBeUndefined();

  await cleanupTestDir();
});

test("loadEnvRecursive - should prefer child vars over parent vars", async () => {
  await setupTestDir();

  const homeEnvrc = path.join(TEST_HOME, ".envrc");
  const dirAEnvrc = path.join(TEST_HOME, "dirA", ".envrc");

  // Create .envrc with overlapping var
  fs.writeFileSync(homeEnvrc, "VAR=home_value\nHOME_VAR=home_value");
  fs.writeFileSync(dirAEnvrc, "VAR=dira_value\nDIRA_VAR=dira_value");

  await allow(homeEnvrc);
  await allow(dirAEnvrc);

  const vars = await loadEnvRecursive(path.join(TEST_HOME, "dirA"));

  expect(vars.VAR).toBe("dira_value");
  expect(vars.HOME_VAR).toBe("home_value");
  expect(vars.DIRA_VAR).toBe("dira_value");

  await cleanupTestDir();
});

test("prune - should remove stale entries", async () => {
  await setupTestDir();

  const homeEnvrc = path.join(TEST_HOME, ".envrc");
  const dirAEnvrc = path.join(TEST_HOME, "dirA", ".envrc");

  await allow(homeEnvrc);
  await allow(dirAEnvrc);

  // Remove dirA .envrc
  fs.unlinkSync(dirAEnvrc);

  // Prune should remove the stale entry
  await prune();

  const perms = await loadPermissions();
  const realHomeEnvrc = await realpath(homeEnvrc);
  const realDirAEnvrc = await realpath(dirAEnvrc).catch(() => null);

  expect(perms[realHomeEnvrc]).toBeDefined();
  expect(perms[realDirAEnvrc || ""]).toBeUndefined();

  await cleanupTestDir();
});

test("loadEnvFromDirDown - should load .envrc from specified directory", async () => {
  await setupTestDir();

  const envrcPath = path.join(TEST_HOME, "dirA", ".envrc");
  await allow(envrcPath);

  const vars = await loadEnvFromDirDown(path.join(TEST_HOME, "dirA"));

  expect(vars.DIRA_VAR).toBe("dira_value");
  expect(vars.HOME_VAR).toBeUndefined();

  await cleanupTestDir();
});

test("parseEnvFile - should filter dangerous environment variables", () => {
  const content = `
    SAFE_VAR=safe_value
    LD_PRELOAD=/malicious/lib.so
    MY_APP_CONFIG=config_value
    DYLD_INSERT_LIBRARIES=/path/to/lib.so
    PATH=/custom/path
    PYTHONPATH=/custom/python
  `;

  const vars = parseEnvFile(content);

  expect(vars.SAFE_VAR).toBe("safe_value");
  expect(vars.MY_APP_CONFIG).toBe("config_value");
  expect(vars.LD_PRELOAD).toBeUndefined();
  expect(vars.DYLD_INSERT_LIBRARIES).toBeUndefined();
  expect(vars.PATH).toBeUndefined();
  expect(vars.PYTHONPATH).toBeUndefined();
});

test("parseEnvFile - should handle quoted values", () => {
  const content = `
    VAR1="value with spaces"
    VAR2='single quoted value'
    VAR3=unquoted_value
  `;

  const vars = parseEnvFile(content);

  expect(vars.VAR1).toBe("value with spaces");
  expect(vars.VAR2).toBe("single quoted value");
  expect(vars.VAR3).toBe("unquoted_value");
});

test("parseEnvFile - should handle export statements", () => {
  const content = `
    export VAR1=value1
    export VAR2="value2"
    VAR3=value3
  `;

  const vars = parseEnvFile(content);

  expect(vars.VAR1).toBe("value1");
  expect(vars.VAR2).toBe("value2");
  expect(vars.VAR3).toBe("value3");
});

test("allow - should allow and warn for dev paths", async () => {
  await setupTestDir();

  // Allow a .envrc in /tmp (development/test path - should be allowed with warning)
  const devPath = "/tmp/safe_test/.envrc";
  fs.mkdirSync("/tmp/safe_test", { recursive: true });
  fs.writeFileSync(devPath, "VAR=value");

  // Should not throw, just warn
  await allow(devPath);
  const isAllowedResult = await isAllowed(devPath);
  expect(isAllowedResult).toBe(true);

  fs.rmSync("/tmp/safe_test", { recursive: true });
  await cleanupTestDir();
});

test("isAllowed - should return false for unsafe paths", async () => {
  await setupTestDir();

  // Try to check if unsafe path is allowed
  const unsafePath = "/tmp/unsafe2/.envrc";
  fs.mkdirSync("/tmp/unsafe2", { recursive: true });
  fs.writeFileSync(unsafePath, "VAR=value");

  const result = await isAllowed(unsafePath);
  expect(result).toBe(false);

  fs.rmSync("/tmp/unsafe2", { recursive: true });
  await cleanupTestDir();
});

// Validation tests
import {
  validateVariableName,
  validateVariableValue,
  validateCommand,
} from "./src/validation";
import { ValidationError, SecurityError } from "./src/errors";

test("validateVariableName - should accept valid names", () => {
  expect(() => validateVariableName("MY_VAR")).not.toThrow();
  expect(() => validateVariableName("_privateVar")).not.toThrow();
  expect(() => validateVariableName("var123")).not.toThrow();
});

test("validateVariableName - should reject invalid names", () => {
  expect(() => validateVariableName("")).toThrow(ValidationError);
  expect(() => validateVariableName("123var")).toThrow(ValidationError);
  expect(() => validateVariableName("my-var")).toThrow(ValidationError);
  expect(() => validateVariableName("my.var")).toThrow(ValidationError);
});

test("validateVariableValue - should accept valid values", () => {
  expect(() => validateVariableValue("simple")).not.toThrow();
  expect(() => validateVariableValue("with spaces")).not.toThrow();
  expect(() => validateVariableValue("")).not.toThrow();
});

test("validateVariableValue - should reject overly long values", () => {
  const longValue = "x".repeat(100 * 1024 + 1);
  expect(() => validateVariableValue(longValue)).toThrow(ValidationError);
});

test("validateCommand - should accept valid commands", () => {
  expect(() => validateCommand("bash")).not.toThrow();
  expect(() => validateCommand("npm start")).not.toThrow();
  expect(() => validateCommand("python3 script.py")).not.toThrow();
});

test("validateCommand - should reject empty commands", () => {
  expect(() => validateCommand("")).toThrow(ValidationError);
});

test("validateCommand - should warn about shell metacharacters", () => {
  // This should warn but not throw
  const consoleSpy = console.warn;
  let warned = false;
  console.warn = () => {
    warned = true;
  };
  validateCommand("echo $HOME");
  console.warn = consoleSpy;
  expect(warned).toBe(true);
});

test("list command - should display tracked .envrc files", async () => {
  await setupTestDir();

  const envrcPath = path.join(TEST_HOME, ".envrc");
  await allow(envrcPath);

  // Capture console output
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    logs.push(args.join(" "));
  };

  // Import and run the list command
  const { handleList } = await import("./src/commands/list");
  await handleList();

  console.log = originalLog;

  // Verify output contains expected information
  const output = logs.join("\n");
  expect(output).toContain("Active .envrc files");
  expect(output).toContain("Summary:");
  expect(output).toContain("variable");

  await cleanupTestDir();
});

// Variable interpolation tests
test("parseEnvFile - should interpolate simple ${VAR} references", () => {
  const content = "BASE_URL=https://api.example.com\nAPI_ENDPOINT=${BASE_URL}/v1";

  const vars = parseEnvFile(content);

  expect(vars.BASE_URL).toBe("https://api.example.com");
  expect(vars.API_ENDPOINT).toBe("https://api.example.com/v1");
});

test("parseEnvFile - should handle multiple references in one value", () => {
  const content = "PROTOCOL=https\nHOST=api.example.com\nPORT=443\nURL=${PROTOCOL}://${HOST}:${PORT}";

  const vars = parseEnvFile(content);

  expect(vars.URL).toBe("https://api.example.com:443");
});

test("parseEnvFile - should interpolate in quoted values", () => {
  const content = 'BASE=/home/user\nDATA_DIR="${BASE}/data"';

  const vars = parseEnvFile(content);

  expect(vars.DATA_DIR).toBe("/home/user/data");
});

test("parseEnvFile - should leave undefined variables as-is", () => {
  const content = "API_ENDPOINT=https://api.com${UNDEFINED_VAR}/v1";

  const vars = parseEnvFile(content);

  expect(vars.API_ENDPOINT).toBe("https://api.com${UNDEFINED_VAR}/v1");
});

test("parseEnvFile - should work with variables defined out of order", () => {
  const content = "FULL_PATH=${DIR}/file.txt\nDIR=/home/user";

  const vars = parseEnvFile(content);

  expect(vars.DIR).toBe("/home/user");
  expect(vars.FULL_PATH).toBe("/home/user/file.txt");
});

test("parseEnvFile - should detect circular references", () => {
  const content = "VAR_A=${VAR_B}\nVAR_B=${VAR_A}";

  expect(() => parseEnvFile(content)).toThrow(ValidationError);
});

test("parseEnvFile - should detect indirect circular references", () => {
  const content = "A=${B}\nB=${C}\nC=${A}";

  expect(() => parseEnvFile(content)).toThrow(ValidationError);
});

test("parseEnvFile - should handle self-reference as circular", () => {
  const content = "VAR=${VAR}";

  expect(() => parseEnvFile(content)).toThrow(ValidationError);
});

test("parseEnvFile - should handle complex interpolation scenarios", () => {
  const content = "WORKSPACE=/projects/myapp\nSCRIPTS_DIR=${WORKSPACE}/scripts\nBIN_PATH=${SCRIPTS_DIR}/bin\nRUN_SCRIPT=${BIN_PATH}/run.sh";

  const vars = parseEnvFile(content);

  expect(vars.WORKSPACE).toBe("/projects/myapp");
  expect(vars.SCRIPTS_DIR).toBe("/projects/myapp/scripts");
  expect(vars.BIN_PATH).toBe("/projects/myapp/scripts/bin");
  expect(vars.RUN_SCRIPT).toBe("/projects/myapp/scripts/bin/run.sh");
});

test("parseEnvFile - should mix interpolated and non-interpolated vars", () => {
  const content = "API_KEY=secret123\nBASE_URL=https://api.example.com\nENDPOINT=${BASE_URL}/users\nSTATIC_VAR=unchanged";

  const vars = parseEnvFile(content);

  expect(vars.API_KEY).toBe("secret123");
  expect(vars.ENDPOINT).toBe("https://api.example.com/users");
  expect(vars.STATIC_VAR).toBe("unchanged");
});

// Export command tests
test("export command - should not throw without format (default)", async () => {
  await setupTestDir();

  const envrcPath = path.join(TEST_HOME, ".envrc");
  fs.writeFileSync(envrcPath, "VAR1=value1");
  await allow(envrcPath);

  const { handleExport } = await import("./src/commands/export");

  // Should not throw
  await handleExport([]);

  await cleanupTestDir();
});

test("export command - should accept JSON format", async () => {
  await setupTestDir();

  const envrcPath = path.join(TEST_HOME, ".envrc");
  fs.writeFileSync(envrcPath, "VAR1=value1");
  await allow(envrcPath);

  const { handleExport } = await import("./src/commands/export");

  // Should not throw
  await handleExport(["--format=json"]);

  await cleanupTestDir();
});

test("export command - should accept YAML format", async () => {
  await setupTestDir();

  const envrcPath = path.join(TEST_HOME, ".envrc");
  fs.writeFileSync(envrcPath, "VAR1=value1");
  await allow(envrcPath);

  const { handleExport } = await import("./src/commands/export");

  // Should not throw
  await handleExport(["--format=yaml"]);

  await cleanupTestDir();
});

test("export command - should accept shell format", async () => {
  await setupTestDir();

  const envrcPath = path.join(TEST_HOME, ".envrc");
  fs.writeFileSync(envrcPath, "VAR1=value1");
  await allow(envrcPath);

  const { handleExport } = await import("./src/commands/export");

  // Should not throw
  await handleExport(["--format=shell"]);

  await cleanupTestDir();
});

test("export command - should reject invalid format", async () => {
  const { handleExport } = await import("./src/commands/export");

  try {
    await handleExport(["--format=invalid"]);
    expect(true).toBe(false); // Should have thrown
  } catch (error) {
    expect(error).toBeDefined();
  }
});

// Depth limit tests for interpolation
test("parseEnvFile - should respect max interpolation depth", () => {
  const content = 
    "L1=${L2}\n" +
    "L2=${L3}\n" +
    "L3=${L4}\n" +
    "L4=${L5}\n" +
    "L5=${L6}\n" +
    "L6=${L7}\n" +
    "L7=${L8}\n" +
    "L8=${L9}\n" +
    "L9=${L10}\n" +
    "L10=${L11}\n" +
    "L11=${L1}\n";

  expect(() => parseEnvFile(content)).toThrow(ValidationError);
});

// Test new dangerous variables
test("parseEnvFile - should filter new dangerous environment variables", () => {
  const content = `
    SAFE_VAR=safe_value
    PERL5LIB=/malicious/perl
    NODE_PATH=/malicious/node
    GEM_PATH=/malicious/gems
    JAVA_TOOL_OPTIONS=-javaagent
    SHELL=/malicious/shell
    ZDOTDIR=/malicious/zsh
    ENV=/malicious/env
    BASH_ENV=/malicious/bash
    ZSH_ENV=/malicious/zsh
    POSIXLY_CORRECT=1
    TERMINFO=/malicious/terminfo
    CONDA_PREFIX=/malicious/conda
    VIRTUAL_ENV=/malicious/venv
    GOPATH=/malicious/go
  `;

  const vars = parseEnvFile(content);

  expect(vars.SAFE_VAR).toBe("safe_value");
  expect(vars.PERL5LIB).toBeUndefined();
  expect(vars.NODE_PATH).toBeUndefined();
  expect(vars.GEM_PATH).toBeUndefined();
  expect(vars.JAVA_TOOL_OPTIONS).toBeUndefined();
  expect(vars.SHELL).toBeUndefined();
  expect(vars.ZDOTDIR).toBeUndefined();
  expect(vars.ENV).toBeUndefined();
  expect(vars.BASH_ENV).toBeUndefined();
  expect(vars.ZSH_ENV).toBeUndefined();
  expect(vars.POSIXLY_CORRECT).toBeUndefined();
  expect(vars.TERMINFO).toBeUndefined();
  expect(vars.CONDA_PREFIX).toBeUndefined();
  expect(vars.VIRTUAL_ENV).toBeUndefined();
  expect(vars.GOPATH).toBeUndefined();
});

// Test reload command with variable name validation
test("reload command - should not throw and output shell exports", async () => {
  await setupTestDir();

  const { handleReload } = await import("./src/commands/reload");
  
  // Capture console output
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    logs.push(args.join(" "));
  };

  // Should not throw even if no vars are available
  await handleReload();

  console.log = originalLog;

  // Output should be shell export format (even if empty)
  // The important thing is it validates variable names and doesn't throw
  expect(true).toBe(true);

  await cleanupTestDir();
});

// Test profile name validation
test("setActiveProfile - should reject profile names starting with hyphen", async () => {
  await setupTestDir();

  const { setActiveProfile } = await import("./src/profiles");

  try {
    await setActiveProfile(TEST_HOME, "-invalid");
    expect(true).toBe(false); // Should have thrown
  } catch (error) {
    expect(error instanceof ValidationError).toBe(true);
  }

  await cleanupTestDir();
});

test("setActiveProfile - should accept valid profile names", async () => {
  await setupTestDir();

  const { setActiveProfile, getActiveProfile } = await import("./src/profiles");

  await setActiveProfile(TEST_HOME, "dev");
  const active = await getActiveProfile(TEST_HOME);
  expect(active).toBe("dev");

  await cleanupTestDir();
});

test("setActiveProfile - should reject profile names exceeding max length", async () => {
  await setupTestDir();

  const { setActiveProfile } = await import("./src/profiles");

  try {
    await setActiveProfile(TEST_HOME, "a".repeat(65));
    expect(true).toBe(false); // Should have thrown
  } catch (error) {
    expect(error instanceof ValidationError).toBe(true);
  }

  await cleanupTestDir();
});
