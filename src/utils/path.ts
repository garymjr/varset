export async function getVarsetPath(): Promise<string> {
  try {
    const proc = Bun.spawnSync(["which", "varset"], {
      stdout: "pipe",
      env: process.env,
    });
    if (proc.success) {
      return new TextDecoder().decode(proc.stdout).trim();
    }
  } catch {
    // fallthrough
  }
  // Fallback to process.argv[1] if which fails
  return process.argv[1];
}
