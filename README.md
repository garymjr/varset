# varset

A powerful CLI tool for managing environment variables in your project. varset provides secure and flexible control over which environment variables are available to your application and dependencies.

## Features

- **Allow/Deny environment variables** - Control which environment variables are accessible
- **Import from files** - Import environment variables from `.env.*` files into `.envrc`
- **Execute commands** - Run commands with a controlled environment
- **Hook integration** - Integrate with shell environments
- **Prune & Reload** - Clean up and reload environment configurations
- **Standalone binary** - Compile to standalone executables for distribution

## Installation

To install dependencies:

```bash
bun install
```

## Usage

Run the CLI tool:

```bash
bun index.ts [command] [options]
```

### Available Commands

- `allow <variable>` - Allow access to an environment variable
- `deny <variable>` - Deny access to an environment variable
- `edit` - Edit environment variable settings
- `exec [command]` - Execute a command with controlled environment
- `hook` - Set up shell hooks for environment management
- `import [file]` - Import environment variables from a file
- `prune` - Clean up unused environment configurations
- `reload` - Reload environment settings
- `version` - Show version information
- `help` - Show help information

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
