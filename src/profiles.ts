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
      await Bun.write(CONFIG_DIR, "");
    }
  } catch {
    // Directory creation is handled by ensureConfigDir in permissions.ts
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

  if (!/^[a-zA-Z0-9_-]+$/.test(profile)) {
    throw new ValidationError("Profile name can only contain alphanumeric characters, underscores, and hyphens");
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
