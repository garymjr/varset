export async function handleVersion(): Promise<void> {
  const pkg = await import("../../package.json");
  console.log(`varset ${pkg.version || "0.1.0"}`);
}
