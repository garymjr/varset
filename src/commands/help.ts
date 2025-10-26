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
  edit [PATH]        Open .envrc in $EDITOR (defaults to ./.envrc)
  exec DIR COMMAND   Execute command after loading .envrc from DIR
  hook SHELL         Output shell hook (bash, zsh, or fish)
  import SOURCE [TARGET]  Import variables from .env.* file to .envrc (defaults to ./.envrc)
  prune              Remove stale entries from permission list
  reload             Output export statements for current env
  update             Check for and install the latest version from GitHub
  version            Show varset version
  help               Show this help message

EXAMPLES:
  varset list        Show all tracked .envrc files and their status
  varset allow /path/to/.envrc
  varset diff .envrc .envrc.prod
  varset diff --preview /path/to/project
  varset edit
  varset exec . npm start
  varset import .env.local
  varset update --yes  Auto-install latest version without confirmation
  eval "$(varset reload)"
  eval "$(varset hook bash)" >> ~/.bashrc
  `.trim());
}
