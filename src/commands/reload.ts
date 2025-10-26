import { loadEnvRecursive } from "../loader";
import { validateVariableName } from "../validation";

export async function handleReload(): Promise<void> {
  const envVars = await loadEnvRecursive(process.cwd());

  for (const [key, value] of Object.entries(envVars)) {
    // Validate key before embedding in shell code to prevent injection
    validateVariableName(key);
    
    // Escape single quotes in the value
    const escapedValue = value.replace(/'/g, "'\\''");
    console.log(`export ${key}='${escapedValue}'`);
  }
}
