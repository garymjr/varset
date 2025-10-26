import * as path from "path";
import { realpath } from "fs/promises";
import {
  CONFIG_DIR,
} from "./constants";
import { ValidationError } from "./errors";

interface ProfileState {
  [dirPath: string]: string;
}

const PROFILES_FILE = path.join(CONFIG_DIR, "profiles.json");

async function ensureConfigDir(): Promise<void> {
  try {
    const exists = await Bun.file(CONFIG_DIR).exists();
    if (!exists) {
      const fs = await import("fs");
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
  } catch (error) {
    const fs = await import("fs");
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

async function loadProfiles(): Promise<ProfileState> {
  try {
    const file = Bun.file(PROFILES_FILE);
    const exists = await file.exists();
    if (!exists) {
      return {};
    }
    const content = await file.text();
    return JSON.parse(content) as ProfileState;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.warn("Warning: Corrupted profiles file, starting fresh");
      return {};
    }
    return {};
  }
}

async function saveProfiles(state: ProfileState): Promise<void> {
  await ensureConfigDir();
  await Bun.write(PROFILES_FILE, JSON.stringify(state, null, 2));
  // Ensure restrictive permissions on profiles file
  const fs = await import("fs");
  fs.chmodSync(PROFILES_FILE, 0o600);
}

async function getNormalizedPath(dirPath: string): Promise<string> {
  try {
    return await realpath(dirPath);
  } catch {
    return path.resolve(dirPath);
  }
}

export async function getActiveProfile(dirPath: string): Promise<string | null> {
  const normalizedPath = await getNormalizedPath(dirPath);
  const profiles = await loadProfiles();
  return profiles[normalizedPath] || null;
}

export async function setActiveProfile(dirPath: string, profile: string): Promise<void> {
  if (!profile || typeof profile !== "string") {
    throw new ValidationError("Profile name must be a non-empty string");
  }

  // Disallow leading hyphens (could be confused with command flags) and other problematic patterns
  if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(profile) || profile.length > 64) {
    throw new ValidationError(
      "Profile name must start with letter or underscore, contain only alphanumeric characters, underscores, hyphens, and be max 64 characters"
    );
  }

  const normalizedPath = await getNormalizedPath(dirPath);
  const profiles = await loadProfiles();
  profiles[normalizedPath] = profile;
  await saveProfiles(profiles);
}

export async function clearActiveProfile(dirPath: string): Promise<void> {
  const normalizedPath = await getNormalizedPath(dirPath);
  const profiles = await loadProfiles();
  delete profiles[normalizedPath];
  await saveProfiles(profiles);
}

export async function getAllProfiles(): Promise<ProfileState> {
  return await loadProfiles();
}
