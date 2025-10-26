import { generateBashCompletion } from "../completions/bash";
import { generateZshCompletion } from "../completions/zsh";
import { ValidationError } from "../errors";
import { getVarsetPath } from "../utils/path";

export async function handleCompletion(args: string[]): Promise<void> {
  const shell = args[0];

  if (!shell) {
    throw new ValidationError("Usage: varset completion <bash|zsh|fish>");
  }

  const varsetPath = await getVarsetPath();

  let completion: string;
  switch (shell.toLowerCase()) {
    case "bash":
      completion = generateBashCompletion(varsetPath);
      break;
    case "zsh":
      completion = generateZshCompletion(varsetPath);
      break;
    case "fish":
      throw new ValidationError("Fish shell completion coming soon");
    default:
      throw new ValidationError("Unsupported shell. Supported shells: bash, zsh");
  }

  console.log(completion);
}
