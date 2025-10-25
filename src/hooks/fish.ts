export function generateFishHook(varsetPath: string): string {
  return `
# Varset shell hook
function __varset_on_variable_pwd --on-variable PWD
  eval (${varsetPath} reload)
end
`.trim();
}
