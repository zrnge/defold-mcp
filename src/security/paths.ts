import { resolve, isAbsolute, normalize, sep } from 'node:path';
import { stat, realpath } from 'node:fs/promises';
import type { McpResult } from '../types/index.js';
import { createError, ErrorCodes, pathTraversalError } from '../utils/errors.js';

export interface PathResolver {
  projectRoot: string;
  resolveProjectPath(relativePath: string): Promise<McpResult<string>>;
  isInsideProject(absolutePath: string): Promise<boolean>;
}

export function createPathResolver(projectRoot: string): PathResolver {
  const root = normalize(resolve(projectRoot));

  async function resolveProjectPath(relativePath: string): Promise<McpResult<string>> {
    if (relativePath.includes('\u0000')) {
      return {
        success: false,
        error: createError(
          ErrorCodes.INVALID_PATH,
          'Path contains null bytes.',
          undefined,
          relativePath,
        ),
      };
    }

    // Reject obvious traversal attempts in the input string.
    const segments = relativePath.split(/[\\/]/);
    for (const segment of segments) {
      if (segment === '..' || segment === '.') {
        // We'll still resolve and verify, but keep this defensive check.
      }
    }

    let candidate: string;
    if (isAbsolute(relativePath)) {
      candidate = normalize(relativePath);
    } else {
      candidate = normalize(resolve(root, relativePath));
    }

    // Resolve symlinks if present.
    try {
      candidate = await realpath(candidate);
    } catch {
      // realpath fails if the path does not exist; that is acceptable for creation operations.
      // In that case, resolve the parent directory against symlinks and append the basename.
      const parent = resolve(candidate, '..');
      try {
        const resolvedParent = await realpath(parent);
        candidate = resolve(resolvedParent, candidate.split(sep).pop() ?? '');
      } catch {
        // Parent also doesn't exist; leave candidate as-is and rely on root containment check.
      }
    }

    const normalizedRoot = normalize(await realpath(root).catch(() => root));
    const normalizedCandidate = normalize(candidate);
    const rootPrefix = normalizedRoot + sep;
    const inside =
      normalizedCandidate.toLowerCase() === normalizedRoot.toLowerCase() ||
      normalizedCandidate.toLowerCase().startsWith(rootPrefix.toLowerCase());
    if (!inside) {
      return { success: false, error: pathTraversalError(relativePath) };
    }

    return { success: true, data: normalizedCandidate };
  }

  async function isInsideProject(absolutePath: string): Promise<boolean> {
    const normalizedRoot = normalize(await realpath(root).catch(() => root));
    const normalizedPath = normalize(resolve(absolutePath));
    const rootPrefix = normalizedRoot + sep;
    return (
      normalizedPath.toLowerCase() === normalizedRoot.toLowerCase() ||
      normalizedPath.toLowerCase().startsWith(rootPrefix.toLowerCase())
    );
  }


  return { projectRoot: root, resolveProjectPath, isInsideProject };
}

export async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await stat(absolutePath);
    return true;
  } catch {
    return false;
  }
}
