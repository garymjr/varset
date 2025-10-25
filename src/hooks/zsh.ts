export function generateZshHook(varsetPath: string): string {
  return `
# Varset shell hook
__varset_precmd() {
  local current_dir="$PWD"
  if [ -z "$__varset_last_dir" ] || [ "$__varset_last_dir" != "$current_dir" ]; then
    __varset_last_dir="$current_dir"
    eval "$(${varsetPath} reload)"
  fi
}

if [[ ! ":$precmd_functions:" == *":__varset_precmd:"* ]]; then
  precmd_functions=(__varset_precmd $precmd_functions)
fi
`.trim();
}
