import { readFile } from 'node:fs/promises';
import { listProjectFiles } from './project.js';
import { isTextFile } from './files.js';
import type { SearchMatch } from '../types/index.js';

export interface SearchOptions {
  query: string;
  path?: string;
  recursive?: boolean;
  extensions?: string[];
  maxResults?: number;
  caseSensitive?: boolean;
}

export async function searchProject(
  projectRoot: string,
  options: SearchOptions,
): Promise<SearchMatch[]> {
  const files = await listProjectFiles(projectRoot, {
    path: options.path ?? '.',
    recursive: options.recursive ?? true,
    extensions: options.extensions,
  });

  const matches: SearchMatch[] = [];
  const maxResults = options.maxResults ?? 100;
  const query = options.caseSensitive ? options.query : options.query.toLowerCase();

  for (const entry of files) {
    if (matches.length >= maxResults) break;
    if (entry.type !== 'file') continue;
    if (!isTextFile(entry.path)) continue;

    try {
      const contents = await readFile(entry.path, 'utf-8');
      const lines = contents.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (matches.length >= maxResults) break;
        const line = lines[i];
        const compareLine = options.caseSensitive ? line : line.toLowerCase();
        const idx = compareLine.indexOf(query);
        if (idx !== -1) {
          matches.push({
            file: entry.relativePath,
            line: i + 1,
            column: idx + 1,
            text: line.trim(),
            context: line.trim(),
          });
        }
      }
    } catch {
      // Ignore unreadable files.
    }
  }

  return matches;
}

export async function findFilesByName(
  projectRoot: string,
  nameQuery: string,
  options: { extensions?: string[]; maxResults?: number } = {},
): Promise<SearchMatch[]> {
  const files = await listProjectFiles(projectRoot, {
    recursive: true,
    extensions: options.extensions,
  });
  const query = nameQuery.toLowerCase();
  const maxResults = options.maxResults ?? 100;
  return files
    .filter((f) => f.type === 'file' && f.relativePath.toLowerCase().includes(query))
    .slice(0, maxResults)
    .map((f) => ({
      file: f.relativePath,
      line: 1,
      column: 1,
      text: f.relativePath,
      context: f.relativePath,
    }));
}
