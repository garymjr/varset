import { loadEnvFromDirDown } from "../loader";
import { validateDirectory, validateCommand } from "../validation";
import { ValidationError, NotFoundError } from "../errors";

async function commandExists(cmd: string): Promise<boolean> {
  try {
    const proc = Bun.spawnSync(["which", cmd], { stdout: "pipe", stderr: "pipe" });
    return proc.success;
  } catch {
    return false;
  }
}

export async function handleExec(args: string[]): Promise<void> {
  if (args.length < 2) {
    throw new ValidationError("Usage: varset exec <dir> <command> [args...]");
  }

  const dir = args[0];
  const cmd = args[1];
  const cmdArgs = args.slice(2);

  // Validate directory
  await validateDirectory(dir);
  
  // Validate command
  validateCommand(cmd);

  // Verify command exists
  if (!(await commandExists(cmd))) {
    throw new NotFoundError(`Command not found: ${cmd}`);
  }

  const envVars = await loadEnvFromDirDown(dir);
  const mergedEnv = { ...process.env, ...envVars };

  const proc = Bun.spawn([cmd, ...cmdArgs], {
    env: mergedEnv as Record<string, string>,
    stdio: ["inherit", "inherit", "inherit"],
  });

  const exitCode = await proc.exited;
  process.exit(exitCode);
}
