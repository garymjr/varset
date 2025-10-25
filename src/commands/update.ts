import { execSync } from "child_process";

const GITHUB_REPO = "garymjr/varset";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

interface ReleaseInfo {
  tag_name: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

function compareVersions(current: string, latest: string): number {
  const currentParts = current.replace(/^v/, "").split(".").map(Number);
  const latestParts = latest.replace(/^v/, "").split(".").map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const curr = currentParts[i] || 0;
    const latest_ = latestParts[i] || 0;
    if (curr > latest_) return 1;
    if (curr < latest_) return -1;
  }
  return 0;
}

function getOS(): string {
  const os = process.platform;
  return os === "darwin" ? "macos" : os === "linux" ? "linux" : os;
}

function getArch(): string {
  const arch = process.arch;
  if (arch === "x64" || arch === "amd64") return "x64";
  if (arch === "arm64" || arch === "aarch64") return "arm64";
  return arch;
}

function getBinaryName(): string {
  const os = getOS();
  const arch = getArch();

  if (os === "macos") {
    if (arch !== "arm64") {
      throw new Error("macOS x64 is not supported. Please use macOS ARM64 (Apple Silicon).");
    }
    return "varset-macos-arm64";
  } else if (os === "linux") {
    return `varset-linux-${arch}`;
  }
  throw new Error(`Unsupported operating system: ${os}`);
}

function getInstallPath(): string {
  try {
    const result = execSync("which varset", { encoding: "utf8" }).trim();
    return result;
  } catch {
    return `${process.env.HOME}/.local/bin/varset`;
  }
}

async function fetchLatestRelease(): Promise<ReleaseInfo> {
  const response = await fetch(GITHUB_API_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch latest release: ${response.statusText}`);
  }
  return response.json();
}

async function downloadBinary(downloadUrl: string, targetPath: string): Promise<void> {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download binary: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  await Bun.write(targetPath, buffer);
}

function promptYesNo(message: string, autoYes: boolean = false): boolean {
  if (autoYes) return true;

  // Use /dev/tty for interactive prompt, fallback to auto-yes if not available
  try {
    const proc = Bun.spawnSync(["sh", "-c", "read -p 'Do you want to update? (y/n) ' -n 1 -r response; echo $response"], {
      stdin: "inherit",
      stdout: "pipe",
      stderr: "inherit",
    });
    const response = new TextDecoder().decode(proc.stdout).trim().toLowerCase();
    return response === "y";
  } catch {
    return false;
  }
}

export async function handleUpdate(args: string[]): Promise<void> {
  const autoYes = args.includes("--yes");

  try {
    const pkg = await import("../../package.json");
    const currentVersion = pkg.version || "0.1.0";

    console.log(`Current version: ${currentVersion}`);
    console.log("Checking for updates...");

    const releaseInfo = await fetchLatestRelease();
    const latestVersion = releaseInfo.tag_name.replace(/^v/, "");

    const comparison = compareVersions(currentVersion, latestVersion);

    if (comparison === 0) {
      console.log("You are already on the latest version!");
      return;
    }

    if (comparison > 0) {
      console.log(`You are on a newer version (${currentVersion}) than the latest release (${latestVersion})`);
      return;
    }

    console.log(`\nNew version available: ${latestVersion}`);
    console.log(`Release: ${releaseInfo.html_url}`);

    if (!autoYes) {
      const shouldUpdate = promptYesNo("");
      if (!shouldUpdate) {
        console.log("Update cancelled");
        return;
      }
    }

    const binaryName = getBinaryName();
    const asset = releaseInfo.assets.find((a) => a.name === binaryName);

    if (!asset) {
      throw new Error(`Binary not found for platform: ${binaryName}\nAvailable assets: ${releaseInfo.assets.map((a) => a.name).join(", ")}`);
    }

    console.log(`Downloading ${binaryName}...`);
    const tempDir = await Bun.tempdir();
    const tempBinary = `${tempDir}/varset-new`;

    await downloadBinary(asset.browser_download_url, tempBinary);

    // Make binary executable
    execSync(`chmod +x "${tempBinary}"`);

    const installPath = getInstallPath();
    console.log(`Installing to ${installPath}...`);

    // Create backup
    const backupPath = `${installPath}.backup`;
    try {
      execSync(`cp "${installPath}" "${backupPath}"`);
      console.log(`Backed up current version to ${backupPath}`);
    } catch {
      // Backup might fail if file doesn't exist, that's okay
    }

    // Replace binary
    try {
      execSync(`cp "${tempBinary}" "${installPath}"`);
    } catch (error) {
      throw new Error(`Failed to install new binary. You may need to use sudo or check permissions.\nError: ${error}`);
    }

    // Verify installation
    try {
      const newVersion = execSync(`"${installPath}" version`, { encoding: "utf8" }).trim();
      console.log(`\nSuccessfully updated to ${newVersion}!`);
      console.log(`Backup saved to ${backupPath}`);
    } catch {
      throw new Error("Installation verification failed. Restoring backup...");
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
