import { z } from 'zod';
import { readCollection, parseCollection } from '../defold/parser.js';
import { readTextFile, writeTextFile } from '../utils/files.js';
import type { ProjectConfig, McpResult, CollectionInfo } from '../types/index.js';
import { createError, ErrorCodes } from '../utils/errors.js';

export const ReadCollectionSchema = z.object({
  path: z.string(),
});

export const CreateCollectionSchema = z.object({
  path: z.string(),
  name: z.string().default('new_collection'),
});

export const AddGameObjectSchema = z.object({
  collection: z.string(),
  id: z.string(),
  position: z
    .object({ x: z.number().default(0), y: z.number().default(0), z: z.number().default(0) })
    .default({}),
});

export const RemoveGameObjectSchema = z.object({
  collection: z.string(),
  id: z.string(),
  confirm: z.boolean().default(false),
});

const COLLECTION_TEMPLATE = `name: "{{name}}"
scale_along_z: 0
collection {
}
`;

export async function defoldReadCollection(
  config: ProjectConfig,
  args: z.infer<typeof ReadCollectionSchema>,
): Promise<McpResult<CollectionInfo>> {
  const collection = await readCollection(config.projectRoot, args.path);
  if (!collection) {
    return {
      success: false,
      error: createError(
        ErrorCodes.FILE_NOT_FOUND,
        `Collection not found: ${args.path}`,
        undefined,
        args.path,
      ),
    };
  }
  return { success: true, data: collection };
}

export async function defoldCreateCollection(
  config: ProjectConfig,
  args: z.infer<typeof CreateCollectionSchema>,
): Promise<McpResult<{ path: string }>> {
  const content = COLLECTION_TEMPLATE.replace(/\{\{name\}\}/g, args.name);
  const result = await writeTextFile(config.projectRoot, args.path, content, {
    backup: false,
    ensureDir: true,
  });
  if (!result.success || result.data === undefined) {
    return result as McpResult<never>;
  }
  return {
    success: true,
    data: { path: args.path },
    summary: `Created collection ${args.path}.`,
    changed: true,
  };
}

export async function defoldAddGameObjectToCollection(
  config: ProjectConfig,
  args: z.infer<typeof AddGameObjectSchema>,
): Promise<McpResult<{ collection: string; id: string }>> {
  const readResult = await readTextFile(config.projectRoot, args.collection);
  if (!readResult.success || readResult.data === undefined) return readResult as McpResult<never>;

  const goBlock = `  embedded_instances {\n    id: "${args.id}"\n    position {\n      x: ${args.position.x}\n      y: ${args.position.y}\n      z: ${args.position.z}\n    }\n    rotation {\n      x: 0.0\n      y: 0.0\n      z: 0.0\n      w: 1.0\n    }\n    scale {\n      x: 1.0\n      y: 1.0\n      z: 1.0\n    }\n  }\n`;

  const contents = readResult.data.contents;
  const insertIdx = contents.lastIndexOf('}');
  if (insertIdx === -1) {
    return {
      success: false,
      error: createError(
        ErrorCodes.PATCH_FAILED,
        `Could not find insertion point in ${args.collection}`,
        undefined,
        args.collection,
      ),
    };
  }

  const newContents = contents.slice(0, insertIdx) + goBlock + contents.slice(insertIdx);
  const writeResult = await writeTextFile(config.projectRoot, args.collection, newContents, {
    backup: true,
    ensureDir: true,
  });
  if (!writeResult.success || writeResult.data === undefined) return writeResult as McpResult<never>;

  return {
    success: true,
    data: { collection: args.collection, id: args.id },
    summary: `Added game object "${args.id}" to ${args.collection}.`,
    changed: true,
  };
}

export async function defoldRemoveGameObjectFromCollection(
  config: ProjectConfig,
  args: z.infer<typeof RemoveGameObjectSchema>,
): Promise<McpResult<{ collection: string; id: string }>> {
  if (!args.confirm) {
    return {
      success: false,
      error: createError(
        ErrorCodes.MISSING_CONFIRMATION,
        'Removing a game object requires confirm: true.',
        undefined,
        args.collection,
      ),
    };
  }

  const readResult = await readTextFile(config.projectRoot, args.collection);
  if (!readResult.success || readResult.data === undefined) return readResult as McpResult<never>;

  const collection = parseCollection(readResult.data.contents);
  const target = collection.gameObjects.find((go) => go.id === args.id);
  if (!target) {
    return {
      success: false,
      error: createError(
        ErrorCodes.FILE_NOT_FOUND,
        `Game object "${args.id}" not found in ${args.collection}`,
        undefined,
        args.collection,
      ),
    };
  }

  // Naive removal: find the block with id and remove until matching closing brace.
  const lines = readResult.data.contents.split('\n');
  let start = -1;
  let end = -1;
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(`id: "${args.id}"`)) {
      // Find the opening line above.
      for (let j = i; j >= 0; j--) {
        if (lines[j].trim().startsWith('embedded_instances') || lines[j].trim().startsWith('game_objects')) {
          start = j;
          depth = 1;
          break;
        }
      }
    }
    if (start !== -1) {
      if (line.includes('{')) depth++;
      if (line.includes('}')) depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (start === -1 || end === -1) {
    return {
      success: false,
      error: createError(
        ErrorCodes.PATCH_FAILED,
        `Could not locate game object block for "${args.id}".`,
        undefined,
        args.collection,
      ),
    };
  }

  const newContents = [...lines.slice(0, start), ...lines.slice(end + 1)].join('\n');
  const writeResult = await writeTextFile(config.projectRoot, args.collection, newContents, {
    backup: true,
    ensureDir: true,
  });
  if (!writeResult.success || writeResult.data === undefined) return writeResult as McpResult<never>;

  return {
    success: true,
    data: { collection: args.collection, id: args.id },
    summary: `Removed game object "${args.id}" from ${args.collection}.`,
    changed: true,
  };
}
