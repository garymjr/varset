import { handleAllow } from "./src/commands/allow";
import { handleDeny } from "./src/commands/deny";
import { handleDiff } from "./src/commands/diff";
import { handleEdit } from "./src/commands/edit";
import { handleExec } from "./src/commands/exec";
import { handleExport } from "./src/commands/export";
import { handleHook } from "./src/commands/hook";
import { handleImport } from "./src/commands/import";
import { handleList } from "./src/commands/list";
import { handlePrune } from "./src/commands/prune";
import { handleReload } from "./src/commands/reload";
import { handleUpdate } from "./src/commands/update";
import { handleVersion } from "./src/commands/version";
import { handleHelp } from "./src/commands/help";
import { AppError, formatError, getExitCode } from "./src/errors";
import { EXIT_CODE } from "./src/constants";

async function main() {
  const args = Bun.argv.slice(2);
  const command = args[0]?.toLowerCase();

  try {
    switch (command) {
      case "allow":
        await handleAllow(args.slice(1));
        break;
      case "deny":
        await handleDeny(args.slice(1));
        break;
      case "diff":
        await handleDiff(args.slice(1));
        break;
      case "edit":
        await handleEdit(args.slice(1));
        break;
      case "exec":
        await handleExec(args.slice(1));
        break;
      case "export":
        await handleExport(args.slice(1));
        break;
      case "hook":
        await handleHook(args.slice(1));
        break;
      case "import":
        await handleImport(args.slice(1));
        break;
      case "list":
      case "status":
        await handleList();
        break;
      case "prune":
        await handlePrune();
        break;
      case "reload":
        await handleReload();
        break;
      case "update":
      case "upgrade":
        await handleUpdate(args.slice(1));
        break;
      case "version":
        await handleVersion();
        break;
      case "help":
      case undefined:
        await handleHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run 'varset help' for usage information");
        process.exit(EXIT_CODE.GENERAL_ERROR);
    }
  } catch (error) {
    const message = formatError(error);
    console.error("Error:", message);
    const exitCode = getExitCode(error);
    process.exit(exitCode);
  }
}

main();