# Agent Guidelines for varset

## Build & Test Commands
- **Run**: `bun index.ts` (or `bun --hot index.ts` for live reload)
- **Build binary**: `bun build ./index.ts --compile --outfile varset`
- **Test all**: `bun test`
- **Test single file**: `bun test index.test.ts` or `bun test src/permissions.ts`
- **Install**: `bun install`

## Code Style & Architecture
- **Runtime**: Use Bun APIs exclusively (Bun.file, Bun.$, bun:test). See CLAUDE.md for Bun patterns.
- **TypeScript**: Strict mode enabled (`noUncheckedIndexedAccess`, `noImplicitOverride`). No `any` without justification.
- **Imports**: ESNext with bundler resolution; always use `import` statements with full file extensions.
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces/classes/components.
- **Error Handling**: Use custom error classes (AppError, ValidationError, SecurityError, PermissionError, NotFoundError) with proper exit codes. Always catch and handle errors at entry points.
- **Testing**: Use `bun:test` with `test()` and `expect()`. Tests go in `.test.ts` files alongside source code.
- **Module Organization**: Commands in `src/commands/`, utilities in `src/` (loader, permissions, validation, profiles).
- **Environment**: Bun auto-loads `.env`; no dotenv package needed.
