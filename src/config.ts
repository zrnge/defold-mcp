import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import type { ProjectConfig, LogLevel } from './types/index.js';
import { logger } from './utils/logger.js';

const VALID_LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

export function isValidLogLevel(level: string): level is LogLevel {
  return VALID_LOG_LEVELS.includes(level as LogLevel);
}

export interface CliArgs {
  project?: string;
  defoldPath?: string;
  logLevel?: LogLevel;
  help?: boolean;
  version?: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--project':
        args.project = argv[++i];
        break;
      case '--defold-path':
        args.defoldPath = argv[++i];
        break;
      case '--log-level':
        args.logLevel = argv[++i] as LogLevel;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--version':
      case '-v':
        args.version = true;
        break;
    }
  }
  return args;
}

export async function loadConfig(): Promise<ProjectConfig> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.version) {
    process.stderr.write('defold-mcp 0.1.0\n');
    process.exit(0);
  }

  const projectRoot = args.project ?? process.env.DEFOLD_PROJECT_ROOT;
  if (!projectRoot) {
    throw new Error(
      'No project root configured. Use --project or set DEFOLD_PROJECT_ROOT.',
    );
  }

  const resolvedRoot = resolve(projectRoot);
  try {
    const stats = await stat(resolvedRoot);
    if (!stats.isDirectory()) {
      throw new Error(`Project root is not a directory: ${resolvedRoot}`);
    }
  } catch (err) {
    throw new Error(`Project root does not exist: ${resolvedRoot}`);
  }

  const envLevel = process.env.DEFOLD_MCP_LOG_LEVEL;
  let logLevel: LogLevel = 'info';
  if (args.logLevel && isValidLogLevel(args.logLevel)) {
    logLevel = args.logLevel;
  } else if (envLevel && isValidLogLevel(envLevel)) {
    logLevel = envLevel;
  }

  logger.info('Configuration loaded', {
    projectRoot: resolvedRoot,
    defoldPath: args.defoldPath ?? process.env.DEFOLD_PATH,
    logLevel,
  });

  return {
    projectRoot: resolvedRoot,
    defoldPath: args.defoldPath ?? process.env.DEFOLD_PATH,
    logLevel,
  };
}

function printHelp(): void {
  const help = `
defold-mcp [options]

Options:
  --project <path>      Path to the Defold project root
  --defold-path <path>  Path to the Defold installation/CLI
  --log-level <level>  debug | info | warn | error (default: info)
  --help, -h           Show this help
  --version, -v        Show version

Environment variables:
  DEFOLD_PROJECT_ROOT  Project root path
  DEFOLD_PATH          Defold installation/CLI path
  DEFOLD_MCP_LOG_LEVEL Logging level
`;
  process.stderr.write(help);
}
