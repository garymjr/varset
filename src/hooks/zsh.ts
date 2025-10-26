export function generateZshHook(varsetPath: string): string {
  // Shell-escape the path to prevent injection attacks
  const escapedPath = varsetPath.replace(/'/g, "'\\''");
  
  return `
# Varset shell hook
__varset_precmd() {
  local current_dir="$PWD"
  if [ -z "$__varset_last_dir" ] || [ "$__varset_last_dir" != "$current_dir" ]; then
    __varset_last_dir="$current_dir"
    eval "$('${escapedPath}' reload)"
  fi
}

if [[ ! ":$precmd_functions:" == *":__varset_precmd:"* ]]; then
  precmd_functions=(__varset_precmd $precmd_functions)
fi
`.trim();
}
