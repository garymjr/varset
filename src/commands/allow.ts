import * as path from "path";
import { allow as permAllow } from "../permissions";
import { ENVRC_FILENAME } from "../constants";

export async function handleAllow(args: string[]): Promise<void> {
  const targetPath = args[0] || path.join(process.cwd(), ENVRC_FILENAME);
  await permAllow(targetPath);
}
