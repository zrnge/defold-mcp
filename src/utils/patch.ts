import type { McpResult, Diagnostic } from '../types/index.js';
import { createError, ErrorCodes } from './errors.js';

export type PatchOperation =
  | 'replace'
  | 'insert_after'
  | 'insert_before'
  | 'replace_lines'
  | 'delete_lines';

export interface PatchRequest {
  path: string;
  operation: PatchOperation;
  oldText?: string;
  newText?: string;
  startLine?: number;
  endLine?: number;
}

export function applyPatch(contents: string, request: PatchRequest): McpResult<string> {
  const lines = contents.split('\n');

  switch (request.operation) {
    case 'replace': {
      if (!request.oldText || request.newText === undefined) {
        return {
          success: false,
          error: createError(
            ErrorCodes.INVALID_INPUT,
            'Replace operation requires oldText and newText.',
          ),
        };
      }
      const count = occurrences(contents, request.oldText);
      if (count === 0) {
        return {
          success: false,
          error: createError(
            ErrorCodes.PATCH_FAILED,
            `oldText was not found in ${request.path}.`,
            'Verify the exact text including whitespace.',
            request.path,
          ),
        };
      }
      if (count > 1) {
        return {
          success: false,
          error: createError(
            ErrorCodes.AMBIGUOUS_PATCH,
            `oldText occurs ${count} times in ${request.path}.`,
            'Use replace_lines or make oldText unique.',
            request.path,
          ),
        };
      }
      return {
        success: true,
        data: contents.replace(request.oldText, request.newText),
      };
    }

    case 'insert_after': {
      if (!request.oldText || request.newText === undefined) {
        return {
          success: false,
          error: createError(
            ErrorCodes.INVALID_INPUT,
            'insert_after requires oldText and newText.',
          ),
        };
      }
      const idx = contents.indexOf(request.oldText);
      if (idx === -1) {
        return {
          success: false,
          error: createError(
            ErrorCodes.PATCH_FAILED,
            `oldText not found in ${request.path}.`,
            undefined,
            request.path,
          ),
        };
      }
      const before = contents.slice(0, idx + request.oldText.length);
      const after = contents.slice(idx + request.oldText.length);
      return { success: true, data: before + '\n' + request.newText + after };
    }

    case 'insert_before': {
      if (!request.oldText || request.newText === undefined) {
        return {
          success: false,
          error: createError(
            ErrorCodes.INVALID_INPUT,
            'insert_before requires oldText and newText.',
          ),
        };
      }
      const idx = contents.indexOf(request.oldText);
      if (idx === -1) {
        return {
          success: false,
          error: createError(
            ErrorCodes.PATCH_FAILED,
            `oldText not found in ${request.path}.`,
            undefined,
            request.path,
          ),
        };
      }
      const before = contents.slice(0, idx);
      const after = contents.slice(idx);
      return { success: true, data: before + request.newText + '\n' + after };
    }

    case 'replace_lines': {
      if (
        request.startLine === undefined ||
        request.endLine === undefined ||
        request.newText === undefined
      ) {
        return {
          success: false,
          error: createError(
            ErrorCodes.INVALID_INPUT,
            'replace_lines requires startLine, endLine, and newText.',
          ),
        };
      }
      if (request.startLine < 1 || request.endLine > lines.length || request.startLine > request.endLine) {
        return {
          success: false,
          error: createError(
            ErrorCodes.PATCH_FAILED,
            `Line range ${request.startLine}-${request.endLine} is invalid.`,
            undefined,
            request.path,
          ),
        };
      }
      const before = lines.slice(0, request.startLine - 1);
      const after = lines.slice(request.endLine);
      return { success: true, data: [...before, request.newText, ...after].join('\n') };
    }

    case 'delete_lines': {
      if (request.startLine === undefined || request.endLine === undefined) {
        return {
          success: false,
          error: createError(
            ErrorCodes.INVALID_INPUT,
            'delete_lines requires startLine and endLine.',
          ),
        };
      }
      if (request.startLine < 1 || request.endLine > lines.length || request.startLine > request.endLine) {
        return {
          success: false,
          error: createError(
            ErrorCodes.PATCH_FAILED,
            `Line range ${request.startLine}-${request.endLine} is invalid.`,
            undefined,
            request.path,
          ),
        };
      }
      const before = lines.slice(0, request.startLine - 1);
      const after = lines.slice(request.endLine);
      return { success: true, data: [...before, ...after].join('\n') };
    }

    default:
      return {
        success: false,
        error: createError(ErrorCodes.INVALID_INPUT, `Unknown operation: ${String(request.operation)}`),
      };
  }
}

function occurrences(haystack: string, needle: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

export function validateLuaSyntaxLightweight(contents: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = contents.split('\n');
  let openBlocks = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Strip strings and comments for block counting.
    const cleaned = line
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/--.*$/g, '');
    const opens = (cleaned.match(/\bfunction\b|\bdo\b|\bif\b|\bfor\b|\bwhile\b|\brepeat\b|\{/g) ?? []).length;
    const closes = (cleaned.match(/\bend\b|\buntil\b|\}/g) ?? []).length;
    openBlocks += opens - closes;
    if (openBlocks < 0) {
      diagnostics.push({
        line: i + 1,
        severity: 'error',
        message: 'Unexpected closing block (function/end/do/etc).',
      });
      openBlocks = 0;
    }
  }
  if (openBlocks !== 0) {
    diagnostics.push({
      severity: 'error',
      message: `Unclosed Lua blocks detected: ${openBlocks} block(s) not closed.`,
    });
  }
  return diagnostics;
}
