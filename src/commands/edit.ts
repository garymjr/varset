import * as path from "path";
import * as fs from "fs";
import { ENVRC_FILENAME } from "../constants";

export async function handleEdit(args: string[]): Promise<void> {
  const rcPath = args[0] || path.join(process.cwd(), ENVRC_FILENAME);
  const editor = process.env.EDITOR || "vi";

  // Create the file if it doesn't exist
  if (!fs.existsSync(rcPath)) {
    fs.writeFileSync(rcPath, "");
  }

  const proc = Bun.spawn([editor, rcPath], {
    stdio: ["inherit", "inherit", "inherit"],
  });

  await proc.exited;
}
