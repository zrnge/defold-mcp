import { z } from 'zod';
import { getInputBindings, addInputBinding } from '../defold/input.js';
import type { ProjectConfig, McpResult, InputBinding } from '../types/index.js';

export const GetInputBindingsSchema = z.object({});

export const AddInputBindingSchema = z.object({
  action: z.string(),
  input: z.string(),
  type: z.enum(['key', 'mouse', 'gamepad', 'touch', 'text']).default('key'),
});

export async function defoldGetInputBindings(
  config: ProjectConfig,
): Promise<McpResult<{ bindings: InputBinding[] }>> {
  const bindings = await getInputBindings(config.projectRoot);
  return { success: true, data: { bindings } };
}

export async function defoldAddInputBinding(
  config: ProjectConfig,
  args: z.infer<typeof AddInputBindingSchema>,
): Promise<McpResult<{ action: string; input: string }>> {
  await addInputBinding(config.projectRoot, {
    action: args.action,
    input: args.input,
    type: args.type,
  });
  return {
    success: true,
    data: { action: args.action, input: args.input },
    summary: `Added input binding ${args.input} -> ${args.action}.`,
    changed: true,
  };
}
