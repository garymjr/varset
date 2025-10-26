export function generateFishHook(varsetPath: string): string {
  // Shell-escape the path to prevent injection attacks
  const escapedPath = varsetPath.replace(/'/g, "\\'");
  
  return `
# Varset shell hook
function __varset_on_variable_pwd --on-variable PWD
  eval ('${escapedPath}' reload)
end
`.trim();
}
