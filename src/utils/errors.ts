import type { McpError } from '../types/index.js';

export const ErrorCodes = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PATH_TRAVERSAL: 'PATH_TRAVERSAL',
  INVALID_PATH: 'INVALID_PATH',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  NOT_A_PROJECT: 'NOT_A_PROJECT',
  FILE_EXISTS: 'FILE_EXISTS',
  BACKUP_FAILED: 'BACKUP_FAILED',
  PATCH_FAILED: 'PATCH_FAILED',
  AMBIGUOUS_PATCH: 'AMBIGUOUS_PATCH',
  DEFOLD_NOT_FOUND: 'DEFOLD_NOT_FOUND',
  BUILD_FAILED: 'BUILD_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MISSING_CONFIRMATION: 'MISSING_CONFIRMATION',
  INVALID_INPUT: 'INVALID_INPUT',
  BINARY_FILE: 'BINARY_FILE',
  PROCESS_NOT_FOUND: 'PROCESS_NOT_FOUND',
  SYNTAX_ERROR: 'SYNTAX_ERROR',
} as const;

export function createError(
  code: string,
  message: string,
  suggestion?: string,
  path?: string,
): McpError {
  return { code, message, suggestion, path };
}

export function pathTraversalError(path: string): McpError {
  return createError(
    ErrorCodes.PATH_TRAVERSAL,
    `The path "${path}" escapes the configured project root.`,
    'Use a relative path inside the project.',
    path,
  );
}

export function fileNotFoundError(path: string): McpError {
  return createError(
    ErrorCodes.FILE_NOT_FOUND,
    `The requested file does not exist: ${path}`,
    'Check the path and try again.',
    path,
  );
}

export function defoldNotFoundError(): McpError {
  return createError(
    ErrorCodes.DEFOLD_NOT_FOUND,
    'Defold was not detected.',
    'Set DEFOLD_PATH or pass --defold-path.',
  );
}

export function missingConfirmationError(): McpError {
  return createError(
    ErrorCodes.MISSING_CONFIRMATION,
    'This destructive operation requires confirm: true.',
    'Set confirm to true if you really want to proceed.',
  );
}
