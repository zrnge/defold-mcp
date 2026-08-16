/**
 * Shared types used across the Defold MCP server.
 */

export interface ProjectConfig {
  projectRoot: string;
  defoldPath?: string;
  logLevel: LogLevel;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface McpError {
  code: string;
  message: string;
  suggestion?: string;
  path?: string;
}

export interface McpResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: McpError;
  summary?: string;
  changed?: boolean;
  diagnostics?: Diagnostic[];
}

export interface Diagnostic {
  file?: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface DefoldProjectInfo {
  path: string;
  name?: string;
  version?: string;
  dependencies: string[];
  display: Record<string, string>;
  input: Record<string, string>;
  render: Record<string, string>;
  bootstrapCollection?: string;
  mainCollection?: string;
  settings: Record<string, Record<string, string>>;
  files: string[];
  defold?: DefoldEngineInfo;
}

export interface DefoldEngineInfo {
  path?: string;
  version?: string;
  available: boolean;
  platforms: string[];
}

export interface FileEntry {
  path: string;
  relativePath: string;
  type: 'file' | 'directory';
  size?: number;
}

export interface SearchMatch {
  file: string;
  line: number;
  column: number;
  text: string;
  context: string;
}

export interface GameObjectInfo {
  id: string;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number; w: number };
  scale?: { x: number; y: number; z: number };
  parent?: string;
  components: ComponentInfo[];
}

export interface ComponentInfo {
  type: string;
  id: string;
  path?: string;
}

export interface CollectionInfo {
  path: string;
  gameObjects: GameObjectInfo[];
}

export interface LuaAnalysis {
  functions: string[];
  localVariables: string[];
  requires: string[];
  msgPosts: string[];
  goCalls: string[];
  factoryCalls: string[];
  collectionProxyCalls: string[];
  resourceReferences: string[];
  onMessageHandlers: string[];
  syntaxIssues: Diagnostic[];
}

export interface InputBinding {
  action: string;
  input: string;
  type: 'key' | 'mouse' | 'gamepad' | 'touch' | 'text';
}

export interface BuildResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  outputLocation?: string;
  diagnostics: Diagnostic[];
}

export interface RunningProcess {
  processId: number;
  command: string;
  startTime: Date;
  output?: string;
}
