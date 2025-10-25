import { generateBashHook } from "../hooks/bash";
import { generateZshHook } from "../hooks/zsh";
import { generateFishHook } from "../hooks/fish";

export async function handleHook(args: string[]): Promise<void> {
  const shell = args[0];

  if (!shell) {
    console.error("Usage: varset hook <bash|zsh|fish>");
    process.exit(1);
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
      console.error("Unsupported shell. Supported shells: bash, zsh, fish");
      process.exit(1);
  }

  console.log(hook);
}
