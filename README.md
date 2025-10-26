# varset

A powerful CLI tool for managing environment variables in your project. varset provides secure and flexible control over which environment variables are available to your application and dependencies.

## Features

- **Allow/Deny environment variables** - Control which environment variables are accessible
- **Import & Export** - Import environment variables from `.env.*` files and export to multiple formats
- **Environment Profiles** - Switch between different environment configurations (dev, prod, staging, etc.)
- **Diff & Preview** - Compare .envrc files and preview changes before applying them
- **Execute commands** - Run commands with a controlled environment
- **Shell integration** - Support for bash, zsh, and fish shells with hooks and completion
- **Tab completion** - Auto-completion scripts for bash and zsh
- **Prune & Reload** - Clean up stale entries and reload environment configurations
- **Standalone binary** - Compile to standalone executables for distribution
- **Auto-update** - Check for and install the latest version from GitHub

## Installation

### Binary Installation (Recommended)

Install the latest precompiled binary with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/garymjr/varset/main/install.sh | bash
```

This will automatically download and install the appropriate binary for your platform (Linux x64 or macOS ARM64).

**Alternative:** Download directly from [GitHub Releases](https://github.com/garymjr/varset/releases)

### Development Installation

To install dependencies for development:

```bash
bun install
```

## Usage

Run the CLI tool:

```bash
bun index.ts [command] [options]
```

### Available Commands

- `allow [PATH]` - Grant permission to load .envrc (defaults to ./.envrc)
- `deny [PATH]` - Revoke permission to load .envrc (defaults to ./.envrc)
- `diff FILE1 FILE2` - Compare two .envrc files
- `diff --preview [DIR]` - Preview variable changes when entering directory
- `list, status` - Show active .envrc files and their status
- `use [PROFILE]` - Switch to environment profile (dev, prod, staging, etc.)
- `switch [PROFILE]` - Alias for 'use'
- `edit [PATH]` - Open .envrc in $EDITOR (defaults to ./.envrc)
- `exec DIR COMMAND` - Execute command after loading .envrc from directory
- `export [FORMAT]` - Export current environment to specified format (dotenv, json, yaml, shell)
- `hook SHELL` - Output shell hook (bash, zsh, or fish)
- `completion SHELL` - Output completion script for shell (bash or zsh)
- `import SOURCE [TARGET]` - Import variables from .env.* file to .envrc (defaults to ./.envrc)
- `prune` - Remove stale entries from permission list
- `reload` - Output export statements for current environment
- `update` - Check for and install the latest version from GitHub
- `upgrade` - Alias for 'update'
- `version` - Show varset version
- `help` - Show help information

## Usage Examples

### Allow/Deny .envrc Files

```bash
varset allow /path/to/.envrc
varset deny /path/to/.envrc
```

### Compare and Preview Changes

```bash
# Compare two .envrc files
varset diff .envrc .envrc.prod

# Preview changes when entering a directory
varset diff --preview /path/to/project
```

### Switch Environment Profiles

```bash
# Switch to dev environment
varset use dev

# Switch to production environment
varset switch prod

# Show current active profile
varset use
```

### Export Environment Variables

```bash
# Export in .env format (default)
varset export > .env

# Export in JSON format
varset export --format=json > env.json

# Export in YAML format
varset export --format=yaml > env.yaml

# Export as shell script
varset export --format=shell > load-env.sh
```

### Import Variables from .env Files

```bash
varset import .env.local
varset import .env.production .envrc.prod
```

### Shell Integration

```bash
# Install bash hook
eval "$(varset hook bash)" >> ~/.bashrc

# Install zsh hook
eval "$(varset hook zsh)" >> ~/.zshrc

# Install bash completion
eval "$(varset completion bash)" >> ~/.bashrc

# Install zsh completion
eval "$(varset completion zsh)" >> ~/.zshrc
```

### Execute Commands with Environment

```bash
varset exec . npm start
varset exec /path/to/project yarn dev
```

### Other Commands

```bash
# List active .envrc files and their status
varset list

# Clean up stale entries
varset prune

# Reload environment
eval "$(varset reload)"

# Check for updates
varset update --yes
```

## Development

To run the development server with hot reload:

```bash
bun --hot index.ts
```

To run tests:

```bash
bun test
```

## Building

Build a standalone binary:

```bash
# macOS ARM64
bun run build:macos

# Linux x64
bun run build:linux

# Generic
bun run build
```

## License

MIT - See LICENSE file for details
