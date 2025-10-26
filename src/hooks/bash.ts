export function generateBashHook(varsetPath: string): string {
  // Shell-escape the path to prevent injection attacks
  const escapedPath = varsetPath.replace(/'/g, "'\\''");
  
  return `
# Varset shell hook
__varset_prompt_command() {
  local current_dir="$PWD"
  if [ -z "$__varset_last_dir" ] || [ "$__varset_last_dir" != "$current_dir" ]; then
    __varset_last_dir="$current_dir"
    eval "$('${escapedPath}' reload)"
  fi
}

if [[ ":$PROMPT_COMMAND:" != *":__varset_prompt_command:"* ]]; then
  PROMPT_COMMAND="__varset_prompt_command:$PROMPT_COMMAND"
fi
`.trim();
}
