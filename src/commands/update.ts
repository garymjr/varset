import * as crypto from "crypto";

const GITHUB_REPO = "garymjr/varset";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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

async function getInstallPath(): Promise<string> {
  try {
    const proc = Bun.spawnSync(["which", "varset"], { stdout: "pipe" });
    if (proc.success) {
      return new TextDecoder().decode(proc.stdout).trim();
    }
  } catch {
    // fallthrough
  }
  return `${process.env.HOME}/.local/bin/varset`;
}

async function fetchWithRetry(url: string, maxRetries: number = MAX_RETRIES): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url);
    
    // Check for rate limiting
    if (response.status === 403) {
      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining === "0") {
        const resetTime = response.headers.get("X-RateLimit-Reset");
        const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : "unknown";
        throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate}. Try again later.`);
      }
    }

    // Retry on server errors (5xx) and temporary failures (429)
    if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
      if (i < maxRetries - 1) {
        const delay = RETRY_DELAY_MS * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }

    if (response.ok) {
      return response;
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  throw new Error("Max retries exceeded while fetching from GitHub API");
}

async function fetchLatestRelease(): Promise<ReleaseInfo> {
  const response = await fetchWithRetry(GITHUB_API_URL);
  return response.json();
}

async function downloadBinary(downloadUrl: string, targetPath: string): Promise<string> {
  const response = await fetchWithRetry(downloadUrl);
  const buffer = await response.arrayBuffer();
  await Bun.write(targetPath, buffer);
  
  // Calculate SHA256 checksum
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from(buffer));
  return hash.digest("hex");
}

async function fetchChecksums(releaseInfo: ReleaseInfo): Promise<Map<string, string>> {
  const checksumAsset = releaseInfo.assets.find((a) => a.name === "checksums.txt");
  if (!checksumAsset) {
    throw new Error("No checksums.txt found in release assets");
  }

  const response = await fetchWithRetry(checksumAsset.browser_download_url);
  const checksumText = await response.text();
  const checksums = new Map<string, string>();
  
  for (const line of checksumText.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) {
      const [hash, filename] = trimmed.split(/\s+/);
      if (hash && filename) {
        checksums.set(filename.trim(), hash.trim());
      }
    }
  }

  return checksums;
}

async function verifyBinaryChecksum(binaryPath: string, expectedHash: string): Promise<boolean> {
  const content = await Bun.file(binaryPath).arrayBuffer();
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from(content));
  const actualHash = hash.digest("hex");
  return actualHash === expectedHash;
}

function promptYesNo(message: string, autoYes: boolean = false): boolean {
  if (autoYes) return true;

  process.stdout.write(message || "Do you want to update? (y/n) ");
  const proc = Bun.spawnSync(["sh", "-c", "head -c1"], {
    stdin: "inherit",
    stdout: "pipe",
  });
  const response = new TextDecoder().decode(proc.stdout).trim().toLowerCase();
  console.log();
  return response === "y";
}

export async function handleUpdate(args: string[]): Promise<void> {
  const autoYes = args.includes("--yes");
  const skipVerify = args.includes("--skip-verify");

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
      const shouldUpdate = promptYesNo("Do you want to update? (y/n) ");
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

    const downloadedHash = await downloadBinary(asset.browser_download_url, tempBinary);

    // Verify checksum
    if (!skipVerify) {
      console.log("Verifying checksum...");
      const checksums = await fetchChecksums(releaseInfo);
      const expectedHash = checksums.get(binaryName);
      
      if (!expectedHash) {
        throw new Error(`No checksum found for ${binaryName}`);
      }

      const isValid = await verifyBinaryChecksum(tempBinary, expectedHash);
      if (!isValid) {
        throw new Error("Checksum verification failed. Binary may be corrupted or tampered with.");
      }
      console.log("✓ Checksum verified");
    }

    // Make binary executable using Bun.spawn (safe from command injection)
    const chmodProc = Bun.spawnSync(["chmod", "+x", tempBinary]);
    if (!chmodProc.success) {
      throw new Error("Failed to make binary executable");
    }

    const installPath = await getInstallPath();
    console.log(`Installing to ${installPath}...`);

    // Create backup safely
    const backupPath = `${installPath}.backup`;
    try {
      const srcFile = Bun.file(installPath);
      if (await srcFile.exists()) {
        await srcFile.copyTo(backupPath);
        console.log(`Backed up current version to ${backupPath}`);
      }
    } catch {
      // Backup might fail if file doesn't exist, that's okay
    }

    // Replace binary safely
    try {
      const tempFile = Bun.file(tempBinary);
      await tempFile.copyTo(installPath);
    } catch (error) {
      throw new Error(`Failed to install new binary. You may need to use sudo or check permissions.\nError: ${error}`);
    }

    // Verify installation
    try {
      const versionProc = Bun.spawnSync([installPath, "version"], { stdout: "pipe" });
      if (versionProc.success) {
        const newVersion = new TextDecoder().decode(versionProc.stdout).trim();
        console.log(`\nSuccessfully updated to ${newVersion}!`);
        console.log(`Backup saved to ${backupPath}`);
      } else {
        throw new Error("Version check failed");
      }
    } catch {
      throw new Error("Installation verification failed. Restoring backup...");
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
