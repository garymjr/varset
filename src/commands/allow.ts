import * as path from "path";
import { allow as permAllow } from "../permissions";

export async function handleAllow(args: string[]): Promise<void> {
  const targetPath = args[0] || path.join(process.cwd(), ".envrc");
  await permAllow(targetPath);
}
