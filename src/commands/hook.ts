import { generateBashHook } from "../hooks/bash";
import { generateZshHook } from "../hooks/zsh";
import { generateFishHook } from "../hooks/fish";
import { ValidationError } from "../errors";

export async function handleHook(args: string[]): Promise<void> {
  const shell = args[0];

  if (!shell) {
    throw new ValidationError("Usage: varset hook <bash|zsh|fish>");
  }

  // Get the path to the varset executable
  const varsetPath = process.argv[1];

  let hook: string;
  switch (shell.toLowerCase()) {
    case "bash":
      hook = generateBashHook(varsetPath);
      break;
    case "zsh":
      hook = generateZshHook(varsetPath);
      break;
    case "fish":
      hook = generateFishHook(varsetPath);
      break;
    default:
      throw new ValidationError("Unsupported shell. Supported shells: bash, zsh, fish");
  }

  console.log(hook);
}
