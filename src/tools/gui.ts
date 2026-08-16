import { z } from 'zod';
import { readTextFile, writeTextFile } from '../utils/files.js';
import type { ProjectConfig, McpResult } from '../types/index.js';
import { createError, ErrorCodes } from '../utils/errors.js';

export const CreateGuiSchema = z.object({
  path: z.string(),
  script: z.string().optional(),
});

export const CreateGuiNodeSchema = z.object({
  gui: z.string(),
  id: z.string(),
  type: z.enum(['box', 'text', 'pie', 'template', 'particlefx']).default('box'),
  position: z
    .object({ x: z.number().default(0), y: z.number().default(0), z: z.number().default(0) })
    .default({}),
  size: z
    .object({ x: z.number().default(100), y: z.number().default(100), z: z.number().default(0) })
    .default({}),
  text: z.string().optional(),
});

const GUI_TEMPLATE = `script: "{{script}}"
background_color {
  x: 0.0
  y: 0.0
  z: 0.0
  w: 0.0
}
`;

const TYPE_MAP: Record<string, string> = {
  box: 'TYPE_BOX',
  text: 'TYPE_TEXT',
  pie: 'TYPE_PIE',
  template: 'TYPE_TEMPLATE',
  particlefx: 'TYPE_PARTICLEFX',
};

export async function defoldCreateGui(
  config: ProjectConfig,
  args: z.infer<typeof CreateGuiSchema>,
): Promise<McpResult<{ path: string }>> {
  const content = GUI_TEMPLATE.replace(/\{\{script\}\}/g, args.script ?? '');
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
    summary: `Created GUI ${args.path}.`,
    changed: true,
  };
}

export async function defoldCreateGuiNode(
  config: ProjectConfig,
  args: z.infer<typeof CreateGuiNodeSchema>,
): Promise<McpResult<{ gui: string; id: string }>> {
  const readResult = await readTextFile(config.projectRoot, args.gui);
  if (!readResult.success || readResult.data === undefined) return readResult as McpResult<never>;

  const pos = args.position ?? { x: 0, y: 0, z: 0 };
  const size = args.size ?? { x: 100, y: 100, z: 0 };
  let nodeBlock = `nodes {\n  id: "${args.id}"\n  type: ${TYPE_MAP[args.type]}\n  position {\n    x: ${pos.x}\n    y: ${pos.y}\n    z: ${pos.z}\n  }\n  size {\n    x: ${size.x}\n    y: ${size.y}\n    z: ${size.z}\n  }\n`;
  if (args.text) {
    nodeBlock += `  text: "${args.text}"\n`;
  }
  nodeBlock += '}\n';

  const contents = readResult.data.contents;
  const insertIdx = contents.lastIndexOf('}');
  if (insertIdx === -1) {
    return {
      success: false,
      error: createError(
        ErrorCodes.PATCH_FAILED,
        `Could not find insertion point in ${args.gui}`,
        undefined,
        args.gui,
      ),
    };
  }

  const newContents = contents.slice(0, insertIdx) + nodeBlock + contents.slice(insertIdx);
  const writeResult = await writeTextFile(config.projectRoot, args.gui, newContents, {
    backup: true,
    ensureDir: true,
  });
  if (!writeResult.success || writeResult.data === undefined) return writeResult as McpResult<never>;

  return {
    success: true,
    data: { gui: args.gui, id: args.id },
    summary: `Added GUI node "${args.id}" to ${args.gui}.`,
    changed: true,
  };
}
