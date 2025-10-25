# Agent Guidelines for varset

## Commands
- **Run**: `bun run index.ts` or `bun index.ts`
- **Run with hot reload**: `bun --hot index.ts`
- **Test all**: `bun test`
- **Test single file**: `bun test <path/to/file.test.ts>`
- **Install dependencies**: `bun install`

## Code Style
- **Runtime**: Use Bun APIs, not Node.js equivalents (see CLAUDE.md for details)
- **TypeScript**: Strict mode enabled with `noUncheckedIndexedAccess` and `noImplicitOverride`
- **Module system**: ESNext with bundler resolution, use `import` statements
- **Types**: All code must be strictly typed, no `any` without justification
- **File I/O**: Prefer `Bun.file()` over `node:fs`
- **HTTP**: Use `Bun.serve()` with routes instead of Express
- **Database**: `bun:sqlite` for SQLite, `Bun.sql` for Postgres, `Bun.redis` for Redis
- **Processes**: Use `Bun.$` for shell commands instead of external libraries
- **Testing**: Use `bun:test` with `test()` and `expect()` from "bun:test"
- **Environment**: Bun auto-loads `.env`, no dotenv needed

## Naming & Formatting
- Use descriptive variable names in camelCase
- Use PascalCase for types, interfaces, and React components
- Keep functions focused and small

## Error Handling
- Handle errors explicitly with try/catch where appropriate
- Use TypeScript's type system to prevent errors at compile time
