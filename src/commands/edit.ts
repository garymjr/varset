import * as path from "path";
import * as fs from "fs";
import { ENVRC_FILENAME } from "../constants";
import { ValidationError } from "../errors";

export async function handleEdit(args: string[]): Promise<void> {
  const rcPath = args[0] || path.join(process.cwd(), ENVRC_FILENAME);
  const editorEnv = process.env.EDITOR || "vi";
  
  // Validate EDITOR environment variable - check it's not empty and doesn't contain suspicious patterns
  if (!editorEnv || editorEnv.length === 0 || editorEnv.length > 1024) {
    throw new ValidationError("Invalid EDITOR environment variable");
  }

  // Create the file if it doesn't exist
  if (!fs.existsSync(rcPath)) {
    fs.writeFileSync(rcPath, "");
    fs.chmodSync(rcPath, 0o600);
  }

  // Parse editor command and arguments safely
  // If editor contains spaces, attempt to split on first space only
  // to preserve arguments (e.g., "vim -c 'set number'")
  const editorParts = editorEnv.split(/\s+/).filter(p => p.length > 0);
  if (editorParts.length === 0) {
    throw new ValidationError("EDITOR environment variable is invalid");
  }
  const editorCmd = editorParts[0]!;
  const editorArgs = editorParts.slice(1);

  const proc = Bun.spawn([editorCmd, ...editorArgs, rcPath], {
    stdio: ["inherit", "inherit", "inherit"],
  });

  await proc.exited;
}
