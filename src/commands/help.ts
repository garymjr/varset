export async function handleHelp(): Promise<void> {
  console.log(`
varset - Environment variable manager for .envrc files

USAGE:
  varset <command> [options]

COMMANDS:
  allow [PATH]       Grant permission to load .envrc (defaults to ./.envrc)
  deny [PATH]        Revoke permission to load .envrc (defaults to ./.envrc)
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
  varset allow /path/to/.envrc
  varset edit
  varset exec . npm start
  varset import .env.local
  varset update --yes  Auto-install latest version without confirmation
  eval "$(varset reload)"
  eval "$(varset hook bash)" >> ~/.bashrc
  `.trim());
}
