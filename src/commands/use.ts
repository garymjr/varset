import * as path from "path";
import { getActiveProfile, setActiveProfile } from "../profiles";
import { ValidationError } from "../errors";

export async function handleUse(args: string[]): Promise<void> {
  const profileName = args[0];
  const cwd = process.cwd();

  if (!profileName) {
    const active = await getActiveProfile(cwd);
    if (active) {
      console.log(`Active profile: ${active}`);
    } else {
      console.log("No active profile");
    }
    return;
  }

  const envrcPath = path.join(cwd, `.envrc.${profileName}`);
  const exists = await Bun.file(envrcPath).exists();

  if (!exists) {
    console.warn(`⚠ Warning: .envrc.${profileName} does not exist at ${cwd}`);
  }

  await setActiveProfile(cwd, profileName);
  console.log(`✓ Active profile set to '${profileName}' for ${cwd}`);
}
