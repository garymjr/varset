export function generateZshCompletion(varsetPath: string): string {
  return `
# Varset zsh completion

_varset() {
  local -a commands=(
    'allow:Grant permission to load .envrc (defaults to ./.envrc)'
    'deny:Revoke permission to load .envrc (defaults to ./.envrc)'
    'diff:Compare two .envrc files or preview directory changes'
    'edit:Open .envrc in \\$EDITOR (defaults to ./.envrc)'
    'exec:Execute command after loading .envrc from DIR'
    'export:Export current environment to specified format'
    'hook:Output shell hook (bash, zsh, or fish)'
    'import:Import variables from .env.* file to .envrc'
    'list:Show active .envrc files and their status'
    'status:Show active .envrc files and their status'
    'use:Switch to environment profile (dev, prod, staging, etc.)'
    'switch:Alias for use command'
    'prune:Remove stale entries from permission list'
    'reload:Output export statements for current env'
    'update:Check for and install the latest version from GitHub'
    'upgrade:Check for and install the latest version from GitHub'
    'version:Show varset version'
    'help:Show help message'
    'completion:Output completion script for shell'
  )

  local context state line
  local -A opt_args

  _arguments -C \\
    '1: :->command' \\
    '*: :->args'

  case \$state in
    command)
      _describe 'command' commands
      ;;
    args)
      local cmd=\${line[1]}
      case \$cmd in
        allow|deny|edit)
          _files -g '.envrc*'
          ;;
        diff)
          if [[ "\${line[2]}" == "--preview" ]]; then
            _directories
          elif [[ "\${line[2]}" == --* ]]; then
            _arguments '1:({--preview})'
          else
            _files -g '.envrc*'
          fi
          ;;
        exec)
          if [[ \$#line -eq 2 ]]; then
            _directories
          fi
          ;;
        export)
          _arguments \\
            '--format=[Export format]:format:(dotenv json yaml shell)' \\
            '1:format:(dotenv json yaml shell)'
          ;;
        hook|completion)
          _arguments '1:shell:(bash zsh fish)'
          ;;
        use|switch)
          if [[ \$#line -eq 2 ]]; then
            local profiles=(\${(f)"$(find . -maxdepth 1 -name '.envrc.*' 2>/dev/null | sed 's|^.*/\.envrc\.||')"})
            _arguments "1:profile:($profiles)"
          fi
          ;;
        import)
          if [[ \$#line -eq 2 ]]; then
            _files -g '.env*'
          elif [[ \$#line -eq 3 ]]; then
            _files -g '.envrc*'
          fi
          ;;
        update|upgrade)
          _arguments '1:(--yes)'
          ;;
      esac
      ;;
  esac
}

compdef _varset varset
`.trim();
}
