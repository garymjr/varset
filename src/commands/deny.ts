import * as path from "path";
import { deny as permDeny } from "../permissions";

export async function handleDeny(args: string[]): Promise<void> {
  const targetPath = args[0] || path.join(process.cwd(), ".envrc");
  await permDeny(targetPath);
}
