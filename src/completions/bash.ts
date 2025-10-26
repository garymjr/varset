export function generateBashCompletion(varsetPath: string): string {
  return `
# Varset bash completion

_varset_completions() {
  local cur prev words cword
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  words=("\${COMP_WORDS[@]}")
  cword=\$COMP_CWORD

  # All available commands
  local commands="allow deny diff edit exec export hook import list status use switch prune reload update upgrade version help completion"

  # If we're completing the command name
  if [[ \$cword -eq 1 ]]; then
    COMPREPLY=( \$(compgen -W "\$commands" -- "\$cur") )
    return 0
  fi

  local cmd="\${words[1]}"

  case "\$cmd" in
    allow|deny|edit)
      # Complete .envrc files in current directory and subdirectories
      local envrc_files=\$(find . -name ".envrc" -o -name ".envrc.*" 2>/dev/null | sed 's|^\./||')
      COMPREPLY=( \$(compgen -W "\$envrc_files" -- "\$cur") )
      ;;
    
    diff)
      if [[ "\$prev" == "diff" ]]; then
        # First file argument - complete .envrc files
        local envrc_files=\$(find . -name ".envrc" -o -name ".envrc.*" 2>/dev/null | sed 's|^\./||')
        COMPREPLY=( \$(compgen -W "\$envrc_files" -- "\$cur") )
      elif [[ "\$prev" == "--preview" ]]; then
        # Directory completion after --preview
        COMPREPLY=( \$(compgen -d -- "\$cur") )
      elif [[ "\$cur" == --* ]]; then
        # Complete flags
        COMPREPLY=( \$(compgen -W "--preview" -- "\$cur") )
      else
        # Second file argument or first if --preview not used
        local envrc_files=\$(find . -name ".envrc" -o -name ".envrc.*" 2>/dev/null | sed 's|^\./||')
        COMPREPLY=( \$(compgen -W "\$envrc_files" -- "\$cur") )
      fi
      ;;
    
    exec)
      if [[ \$cword -eq 2 ]]; then
        # First argument is directory
        COMPREPLY=( \$(compgen -d -- "\$cur") )
      fi
      # Rest is command - no completion
      ;;
    
    export)
      if [[ "\$cur" == --format=* ]]; then
        local format="\${cur#--format=}"
        local formats="dotenv json yaml shell"
        COMPREPLY=( \$(compgen -W "\$formats" -- "\$format" | sed 's/^/--format=/') )
      elif [[ "\$cur" == --* ]]; then
        COMPREPLY=( \$(compgen -W "--format=" -- "\$cur") )
      fi
      ;;
    
    hook|completion)
      # Complete shell types
      if [[ \$cword -eq 2 ]]; then
        COMPREPLY=( \$(compgen -W "bash zsh fish" -- "\$cur") )
      fi
      ;;
    
    use|switch)
      # Complete profile names from .envrc.* files
      if [[ \$cword -eq 2 ]]; then
        local profiles=\$(find . -maxdepth 1 -name ".envrc.*" 2>/dev/null | sed 's|^\./\.envrc\.||')
        COMPREPLY=( \$(compgen -W "\$profiles" -- "\$cur") )
      fi
      ;;
    
    import)
      if [[ \$cword -eq 2 ]]; then
        # First argument - source file (.env.*)
        local env_files=\$(find . -maxdepth 1 -name ".env*" 2>/dev/null | sed 's|^\./||')
        COMPREPLY=( \$(compgen -W "\$env_files" -- "\$cur") )
      elif [[ \$cword -eq 3 ]]; then
        # Second argument - target .envrc file
        local envrc_files=\$(find . -name ".envrc" -o -name ".envrc.*" 2>/dev/null | sed 's|^\./||')
        COMPREPLY=( \$(compgen -W "\$envrc_files" -- "\$cur") )
      fi
      ;;
    
    update|upgrade)
      if [[ "\$cur" == --* ]]; then
        COMPREPLY=( \$(compgen -W "--yes" -- "\$cur") )
      fi
      ;;
  esac
}

complete -o bashdefault -o default -o nospace -F _varset_completions varset
`.trim();
}
