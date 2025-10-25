import { loadEnvRecursive } from "../loader";

export async function handleReload(): Promise<void> {
  const envVars = await loadEnvRecursive(process.cwd());

  for (const [key, value] of Object.entries(envVars)) {
    // Escape single quotes in the value
    const escapedValue = value.replace(/'/g, "'\\''");
    console.log(`export ${key}='${escapedValue}'`);
  }
}
