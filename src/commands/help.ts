export async function handleHelp(): Promise<void> {
  console.log(`
varset - Environment variable manager for .envrc files

USAGE:
  varset <command> [options]

COMMANDS:
  allow [PATH]       Grant permission to load .envrc (defaults to ./.envrc)
  deny [PATH]        Revoke permission to load .envrc (defaults to ./.envrc)
  diff FILE1 FILE2   Compare two .envrc files
  diff --preview [DIR]  Preview variable changes when entering DIR (defaults to .)
  list, status       Show active .envrc files and their status
  use [PROFILE]      Switch to environment profile (e.g., dev, prod, staging)
  switch [PROFILE]   Alias for 'use'
  edit [PATH]        Open .envrc in $EDITOR (defaults to ./.envrc)
  exec DIR COMMAND   Execute command after loading .envrc from DIR
  export [FORMAT]    Export current environment to specified format
  hook SHELL         Output shell hook (bash, zsh, or fish)
  completion SHELL   Output completion script for shell (bash or zsh)
  import SOURCE [TARGET]  Import variables from .env.* file to .envrc (defaults to ./.envrc)
  prune              Remove stale entries from permission list
  reload             Output export statements for current env
  update             Check for and install the latest version from GitHub
  version            Show varset version
  help               Show this help message

EXPORT FORMATS:
  --format=dotenv    Standard .env format (default)
  --format=json      JSON object format
  --format=yaml      YAML format
  --format=shell     Shell script format with export statements

EXAMPLES:
  varset list        Show all tracked .envrc files and their status
  varset allow /path/to/.envrc
  varset diff .envrc .envrc.prod
  varset diff --preview /path/to/project
  varset use dev     Switch to 'dev' environment profile
  varset switch prod Switch to 'prod' environment profile
  varset use         Show current active profile
  varset edit
  varset exec . npm start
  varset export > .env
  varset export --format=json > env.json
  varset export --format=yaml > env.yaml
  varset export --format=shell > load-env.sh
  varset import .env.local
  varset update --yes  Auto-install latest version without confirmation
  eval "$(varset reload)"
  eval "$(varset hook bash)" >> ~/.bashrc
  eval "$(varset completion bash)" >> ~/.bashrc
  eval "$(varset completion zsh)" >> ~/.zshrc
  `.trim());
}
