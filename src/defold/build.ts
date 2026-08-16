import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { pathExists } from '../security/paths.js';
import type { BuildResult, Diagnostic, DefoldEngineInfo } from '../types/index.js';
import { defoldNotFoundError } from '../utils/errors.js';

export async function buildProject(
  projectRoot: string,
  defold: DefoldEngineInfo | undefined,
  options: { platform?: string; configuration?: string } = {},
): Promise<BuildResult> {
  if (!defold?.available || !defold.path) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: '',
      durationMs: 0,
      diagnostics: [
        {
          severity: 'error',
          message: defoldNotFoundError().message,
        },
      ],
    };
  }

  const platform = options.platform ?? 'desktop';
  const configuration = options.configuration ?? 'debug';

  // Defold command-line build can be invoked via bob.jar if available, otherwise we report.
  const bobJar = join(defold.path, '..', 'packages', 'bob.jar');
  const hasBob = await pathExists(bobJar);

  const start = Date.now();
  let exitCode = 0;
  let stdout = '';
  let stderr = '';

  if (hasBob) {
    const args = [
      '-jar',
      bobJar,
      'build',
      '--root',
      projectRoot,
      '--platform',
      platform,
      '--variant',
      configuration,
    ];
    const result = await runCommand('java', args, projectRoot);
    exitCode = result.exitCode;
    stdout = result.stdout;
    stderr = result.stderr;
  } else {
    stdout = 'Defold editor executable found, but bob.jar not detected. Build via editor CLI is limited.';
    stderr = 'Set DEFOLD_PATH to a directory containing bob.jar for headless builds.';
    exitCode = 1;
  }

  const durationMs = Date.now() - start;
  const diagnostics = parseBuildOutput(stdout + '\n' + stderr);

  return {
    exitCode,
    stdout,
    stderr,
    durationMs,
    outputLocation: hasBob ? join(projectRoot, 'build', platform) : undefined,
    diagnostics,
  };
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString('utf-8');
    });
    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString('utf-8');
    });
    child.on('close', (code) => {
      resolve({ exitCode: code ?? 0, stdout, stderr });
    });
    child.on('error', (err) => {
      stderr += String(err);
      resolve({ exitCode: 1, stdout, stderr });
    });
  });
}

export function parseBuildOutput(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    // Match common Lua/Defold error patterns:
    //   player/player.script:42: attempt to ...
    //   main/main.script:10:5: syntax error
    const match = line.match(/([^\s:]+\.\w+):(\d+)(?::(\d+))?\s*:\s*(.+)/);
    if (match) {
      const file = match[1];
      const lineNum = parseInt(match[2], 10);
      const col = match[3] ? parseInt(match[3], 10) : undefined;
      const message = match[4].trim();
      const severity: Diagnostic['severity'] =
        /error|failed|exception/i.test(message) ? 'error' : /warning/i.test(message) ? 'warning' : 'info';
      diagnostics.push({ file, line: lineNum, column: col, severity, message });
    }
  }
  return diagnostics;
}
