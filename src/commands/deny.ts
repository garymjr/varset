import * as path from "path";
import { deny as permDeny } from "../permissions";
import { ENVRC_FILENAME } from "../constants";

export async function handleDeny(args: string[]): Promise<void> {
  const targetPath = args[0] || path.join(process.cwd(), ENVRC_FILENAME);
  await permDeny(targetPath);
}
