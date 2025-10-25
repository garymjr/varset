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
  prune              Remove stale entries from permission list
  reload             Output export statements for current env
  version            Show varset version
  help               Show this help message

EXAMPLES:
  varset allow /path/to/.envrc
  varset edit
  varset exec . npm start
  eval "$(varset reload)"
  eval "$(varset hook bash)" >> ~/.bashrc
  `.trim());
}
