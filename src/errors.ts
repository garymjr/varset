import { EXIT_CODE } from "./constants";

export interface ErrorOptions {
  cause?: Error | unknown;
  exitCode?: number;
}

export class AppError extends Error {
  public readonly exitCode: number;
  public readonly cause?: Error | unknown;

  constructor(message: string, options: ErrorOptions = {}) {
    super(message);
    this.name = this.constructor.name;
    this.exitCode = options.exitCode ?? EXIT_CODE.GENERAL_ERROR;
    this.cause = options.cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      ...options,
      exitCode: options.exitCode ?? EXIT_CODE.VALIDATION_ERROR,
    });
  }
}

export class SecurityError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      ...options,
      exitCode: options.exitCode ?? EXIT_CODE.SECURITY_ERROR,
    });
  }
}

export class PermissionError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      ...options,
      exitCode: options.exitCode ?? EXIT_CODE.PERMISSION_ERROR,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, options: ErrorOptions = {}) {
    super(message, {
      ...options,
      exitCode: options.exitCode ?? EXIT_CODE.COMMAND_NOT_FOUND,
    });
  }
}

/**
 * Format an error for user-friendly output
 */
export function formatError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Get exit code for an error
 */
export function getExitCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.exitCode;
  }
  return EXIT_CODE.GENERAL_ERROR;
}
