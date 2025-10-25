export const ENVRC_FILENAME = ".envrc";
export const PERMISSIONS_FILE_NAME = "allowed.json";
export const LOCK_FILE_NAME = ".permissions.lock";
export const CHECKSUMS_FILE_NAME = "checksums.txt";

export const HOME_DIR = process.env.HOME || "/root";
export const CONFIG_DIR = process.env.VARSET_CONFIG_DIR 
  ? process.env.VARSET_CONFIG_DIR
  : `${HOME_DIR}/.config/varset`;

export const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
export const MAX_PERMISSIONS_ENTRIES = 10000; // Prevent DoS via large permissions file
export const MAX_CONFIG_FILE_SIZE = 10 * 1024 * 1024; // 10 MB for config

export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 1000;
export const RATE_LIMIT_CHECK_INTERVAL_MS = 3600000; // 1 hour
export const MAX_VERSION_CHECKS_PER_HOUR = 3;

// Safe directories where .envrc files can be placed
export const SAFE_BASE_PATHS = [
  HOME_DIR,
  "/opt",
  "/tmp", // For development/testing
];

// Variables that should never be loaded from .envrc (security risk)
export const DANGEROUS_ENV_VARS = new Set([
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "LD_AUDIT",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "DYLD_PRELOAD",
  "ASAN_PRELOAD",
  "UBSAN_PRELOAD",
  "PATH",
  "PYTHONPATH",
  "RUBYLIB",
]);

// Exit codes
export const EXIT_CODE = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  COMMAND_NOT_FOUND: 127,
  VALIDATION_ERROR: 2,
  SECURITY_ERROR: 3,
  PERMISSION_ERROR: 126,
} as const;

// GitHub API constants
export const GITHUB_REPO = "garymjr/varset";
export const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// Variable name validation: must start with letter or underscore, contain only alphanumeric and underscore
export const VALID_VAR_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
