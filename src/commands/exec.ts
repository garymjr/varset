import { loadEnvFromDirDown } from "../loader";

export async function handleExec(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.error("Usage: varset exec <dir> <command> [args...]");
    process.exit(1);
  }

  const dir = args[0];
  const cmd = args[1];
  const cmdArgs = args.slice(2);

  const envVars = await loadEnvFromDirDown(dir);
  const mergedEnv = { ...process.env, ...envVars };

  const proc = Bun.spawn([cmd, ...cmdArgs], {
    env: mergedEnv as Record<string, string>,
    stdio: ["inherit", "inherit", "inherit"],
  });

  const exitCode = await proc.exited;
  process.exit(exitCode);
}
