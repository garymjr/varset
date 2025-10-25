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
import { loadEnvRecursive, loadEnvFromDirDown } from "./src/loader";

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
