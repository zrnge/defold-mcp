import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { ProjectConfig } from './types/index.js';
import { logger } from './utils/logger.js';
import { configureLogger } from './utils/logger.js';
import {
  ListFilesSchema,
  ReadFileSchema,
  WriteFileSchema,
  CreateFileSchema,
  DeleteFileSchema,
  SearchSchema,
  ApplyPatchSchema,
  defoldListFiles,
  defoldReadFile,
  defoldWriteFile,
  defoldCreateFile,
  defoldDeleteFile,
  defoldSearch,
  defoldApplyPatch,
} from './tools/filesystem.js';
import { defoldGetProject } from './tools/project.js';
import {
  AnalyzeLuaSchema,
  ValidateSchema,
  DependenciesSchema,
  defoldAnalyzeLua,
  defoldValidate,
  defoldDependencies,
  defoldProjectContext,
  defoldAnalyzeProject,
} from './tools/analysis.js';
import { BuildSchema, GetBuildErrorsSchema, defoldBuild, defoldGetBuildErrors } from './tools/build.js';
import {
  ReadCollectionSchema,
  CreateCollectionSchema,
  AddGameObjectSchema,
  RemoveGameObjectSchema,
  defoldReadCollection,
  defoldCreateCollection,
  defoldAddGameObjectToCollection,
  defoldRemoveGameObjectFromCollection,
} from './tools/collections.js';
import { CreateGuiSchema, CreateGuiNodeSchema, defoldCreateGui, defoldCreateGuiNode } from './tools/gui.js';
import { GetInputBindingsSchema, AddInputBindingSchema, defoldGetInputBindings, defoldAddInputBinding } from './tools/input.js';
import { RunSchema, StopSchema, ListProcessesSchema, defoldRun, defoldStop, defoldListProcesses } from './tools/run.js';
import { GitStatusSchema, defoldGitStatus } from './tools/git.js';

export async function startServer(config: ProjectConfig): Promise<void> {
  configureLogger(config.logLevel);

  const server = new Server(
    { name: 'defold-mcp', version: '0.1.0' },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: [
        {
          name: 'defold_get_project',
          description: 'Get information about the configured Defold project.',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'defold_list_files',
          description: 'List files and directories in the project.',
          inputSchema: zodToJsonSchema(ListFilesSchema),
        },
        {
          name: 'defold_read_file',
          description: 'Read a text file from the project.',
          inputSchema: zodToJsonSchema(ReadFileSchema),
        },
        {
          name: 'defold_write_file',
          description: 'Write a file in the project. Optionally creates a backup.',
          inputSchema: zodToJsonSchema(WriteFileSchema),
        },
        {
          name: 'defold_create_file',
          description: 'Create a new file in the project.',
          inputSchema: zodToJsonSchema(CreateFileSchema),
        },
        {
          name: 'defold_delete_file',
          description: 'Delete a file or directory. Requires confirm: true.',
          inputSchema: zodToJsonSchema(DeleteFileSchema),
        },
        {
          name: 'defold_search',
          description: 'Search project text files for a query.',
          inputSchema: zodToJsonSchema(SearchSchema),
        },
        {
          name: 'defold_apply_patch',
          description: 'Apply a focused patch to a text file.',
          inputSchema: zodToJsonSchema(ApplyPatchSchema),
        },
        {
          name: 'defold_analyze_lua',
          description: 'Analyze a Lua/Defold script.',
          inputSchema: zodToJsonSchema(AnalyzeLuaSchema),
        },
        {
          name: 'defold_validate',
          description: 'Validate Lua syntax and resource references.',
          inputSchema: zodToJsonSchema(ValidateSchema),
        },
        {
          name: 'defold_dependencies',
          description: 'Get direct and reverse dependencies of a resource.',
          inputSchema: zodToJsonSchema(DependenciesSchema),
        },
        {
          name: 'defold_project_context',
          description: 'Get a compact AI-friendly summary of the project.',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'defold_analyze_project',
          description: 'Analyze project structure and report issues.',
          inputSchema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'defold_build',
          description: 'Build the Defold project if a Defold CLI is available.',
          inputSchema: zodToJsonSchema(BuildSchema),
        },
        {
          name: 'defold_get_build_errors',
          description: 'Parse build output into structured diagnostics.',
          inputSchema: zodToJsonSchema(GetBuildErrorsSchema),
        },
        {
          name: 'defold_read_collection',
          description: 'Read a collection structurally.',
          inputSchema: zodToJsonSchema(ReadCollectionSchema),
        },
        {
          name: 'defold_create_collection',
          description: 'Create a new collection file.',
          inputSchema: zodToJsonSchema(CreateCollectionSchema),
        },
        {
          name: 'defold_add_game_object_to_collection',
          description: 'Add a game object to a collection.',
          inputSchema: zodToJsonSchema(AddGameObjectSchema),
        },
        {
          name: 'defold_remove_game_object_from_collection',
          description: 'Remove a game object from a collection. Requires confirm: true.',
          inputSchema: zodToJsonSchema(RemoveGameObjectSchema),
        },
        {
          name: 'defold_create_gui',
          description: 'Create a new GUI file.',
          inputSchema: zodToJsonSchema(CreateGuiSchema),
        },
        {
          name: 'defold_create_gui_node',
          description: 'Add a node to a GUI file.',
          inputSchema: zodToJsonSchema(CreateGuiNodeSchema),
        },
        {
          name: 'defold_get_input_bindings',
          description: 'Read input bindings.',
          inputSchema: zodToJsonSchema(GetInputBindingsSchema),
        },
        {
          name: 'defold_add_input_binding',
          description: 'Add an input binding.',
          inputSchema: zodToJsonSchema(AddInputBindingSchema),
        },
        {
          name: 'defold_run',
          description: 'Run the Defold project if Defold is available.',
          inputSchema: zodToJsonSchema(RunSchema),
        },
        {
          name: 'defold_stop',
          description: 'Stop a process started by defold_run.',
          inputSchema: zodToJsonSchema(StopSchema),
        },
        {
          name: 'defold_list_processes',
          description: 'List processes started by this MCP.',
          inputSchema: zodToJsonSchema(ListProcessesSchema),
        },
        {
          name: 'defold_git_status',
          description: 'Read-only Git status for the project.',
          inputSchema: zodToJsonSchema(GitStatusSchema),
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info('Tool call', { name, args });

    let result: unknown;
    try {
      switch (name) {
        case 'defold_get_project':
          result = await defoldGetProject(config);
          break;
        case 'defold_list_files':
          result = await defoldListFiles(config, ListFilesSchema.parse(args));
          break;
        case 'defold_read_file':
          result = await defoldReadFile(config, ReadFileSchema.parse(args));
          break;
        case 'defold_write_file':
          result = await defoldWriteFile(config, WriteFileSchema.parse(args));
          break;
        case 'defold_create_file':
          result = await defoldCreateFile(config, CreateFileSchema.parse(args));
          break;
        case 'defold_delete_file':
          result = await defoldDeleteFile(config, DeleteFileSchema.parse(args));
          break;
        case 'defold_search':
          result = await defoldSearch(config, SearchSchema.parse(args));
          break;
        case 'defold_apply_patch':
          result = await defoldApplyPatch(config, ApplyPatchSchema.parse(args));
          break;
        case 'defold_analyze_lua':
          result = await defoldAnalyzeLua(config, AnalyzeLuaSchema.parse(args));
          break;
        case 'defold_validate':
          result = await defoldValidate(config, ValidateSchema.parse(args));
          break;
        case 'defold_dependencies':
          result = await defoldDependencies(config, DependenciesSchema.parse(args));
          break;
        case 'defold_project_context':
          result = await defoldProjectContext(config);
          break;
        case 'defold_analyze_project':
          result = await defoldAnalyzeProject(config);
          break;
        case 'defold_build':
          result = await defoldBuild(config, BuildSchema.parse(args));
          break;
        case 'defold_get_build_errors':
          result = defoldGetBuildErrors(config, GetBuildErrorsSchema.parse(args));
          break;
        case 'defold_read_collection':
          result = await defoldReadCollection(config, ReadCollectionSchema.parse(args));
          break;
        case 'defold_create_collection':
          result = await defoldCreateCollection(config, CreateCollectionSchema.parse(args));
          break;
        case 'defold_add_game_object_to_collection':
          result = await defoldAddGameObjectToCollection(config, AddGameObjectSchema.parse(args));
          break;
        case 'defold_remove_game_object_from_collection':
          result = await defoldRemoveGameObjectFromCollection(config, RemoveGameObjectSchema.parse(args));
          break;
        case 'defold_create_gui':
          result = await defoldCreateGui(config, CreateGuiSchema.parse(args));
          break;
        case 'defold_create_gui_node':
          result = await defoldCreateGuiNode(config, CreateGuiNodeSchema.parse(args));
          break;
        case 'defold_get_input_bindings':
          result = defoldGetInputBindings(config);
          break;
        case 'defold_add_input_binding':
          result = await defoldAddInputBinding(config, AddInputBindingSchema.parse(args));
          break;
        case 'defold_run':
          result = await defoldRun(config, RunSchema.parse(args));
          break;
        case 'defold_stop':
          result = defoldStop(config, StopSchema.parse(args));
          break;
        case 'defold_list_processes':
          result = defoldListProcesses(config);
          break;
        case 'defold_git_status':
          result = await defoldGitStatus(config);
          break;
        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: { code: 'UNKNOWN_TOOL', message: `Unknown tool: ${name}` },
                }),
              },
            ],
            isError: true,
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Tool error', { name, error: message });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: { code: 'TOOL_ERROR', message },
            }),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      isError: !(result as { success: boolean }).success,
    };
  });

  server.setRequestHandler(ListResourcesRequestSchema, () => {
    return {
      resources: [
        { uri: 'defold://project', name: 'Defold Project', mimeType: 'application/json' },
        { uri: 'defold://project/tree', name: 'Project Tree', mimeType: 'application/json' },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    if (uri === 'defold://project') {
      const info = await defoldGetProject(config);
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(info) }] };
    }
    if (uri === 'defold://project/tree') {
      const files = await defoldListFiles(config, { path: '.', recursive: true, includeHidden: false });
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(files) }] };
    }
    return {
      contents: [
        { uri, mimeType: 'text/plain', text: JSON.stringify({ success: false, error: 'Unknown resource' }) },
      ],
    };
  });

  server.setRequestHandler(ListPromptsRequestSchema, () => {
    return {
      prompts: [
        { name: 'defold_debug_game', description: 'Guide for debugging a Defold game.' },
        { name: 'defold_create_feature', description: 'Guide for adding a new feature.' },
        { name: 'defold_review_project', description: 'Guide for reviewing a project.' },
      ],
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, (request) => {
    const name = request.params.name;
    const text = getPromptText(name);
    return { messages: [{ role: 'user', content: { type: 'text', text } }] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Defold MCP server started', { projectRoot: config.projectRoot });
}

function zodToJsonSchema(schema: { _def?: { shape?: () => Record<string, unknown> } }): Record<string, unknown> {
  // Minimal conversion for ZodObject schemas.
  const shape = schema._def?.shape?.() ?? {};
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(shape)) {
    const zodType = (value as { _def?: { typeName?: string }; description?: string })._def?.typeName;
    const description = (value as { description?: string }).description;
    if (zodType === 'ZodString') {
      properties[key] = { type: 'string', description };
    } else if (zodType === 'ZodBoolean') {
      properties[key] = { type: 'boolean', description };
    } else if (zodType === 'ZodNumber') {
      properties[key] = { type: 'number', description };
    } else if (zodType === 'ZodArray') {
      properties[key] = { type: 'array', description };
    } else if (zodType === 'ZodEnum') {
      const values = (value as { _def?: { values?: string[] } })._def?.values ?? [];
      properties[key] = { type: 'string', enum: values, description };
    } else {
      properties[key] = { description };
    }
    const isOptional = (value as { isOptional?: () => boolean }).isOptional?.() ?? false;
    if (!isOptional) required.push(key);
  }
  return { type: 'object', properties, required };
}

function getPromptText(name: string): string {
  switch (name) {
    case 'defold_debug_game':
      return 'Use defold_project_context to understand the project, then defold_build and defold_get_build_errors to find issues. Read relevant files with defold_read_file and apply focused patches with defold_apply_patch.';
    case 'defold_create_feature':
      return 'Start with defold_project_context. Identify the relevant scripts, collections, and input bindings. Use defold_apply_patch for small Lua changes and defold_validate after edits.';
    case 'defold_review_project':
      return 'Use defold_analyze_project to get a high-level overview. Inspect duplicate IDs, missing resources, and message flows with defold_dependencies and defold_find_messages.';
    default:
      return 'Unknown prompt.';
  }
}
