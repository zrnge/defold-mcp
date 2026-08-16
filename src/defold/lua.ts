import type { LuaAnalysis, Diagnostic } from '../types/index.js';

/**
 * Lightweight Lua analyzer for Defold scripts.
 * This is intentionally regex-based and does not claim to be a full AST parser.
 */

export function analyzeLuaScript(contents: string): LuaAnalysis {
  const functions: string[] = [];
  const localVariables: string[] = [];
  const requires: string[] = [];
  const msgPosts: string[] = [];
  const goCalls: string[] = [];
  const factoryCalls: string[] = [];
  const collectionProxyCalls: string[] = [];
  const resourceReferences: string[] = [];
  const onMessageHandlers: string[] = [];
  const syntaxIssues: Diagnostic[] = [];

  const lines = contents.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Function definitions
    const funcMatch = line.match(/^(?:local\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_.:-]*)/);
    if (funcMatch) {
      functions.push(funcMatch[1]);
    }

    // Local variable declarations
    const localMatch = line.match(/local\s+([a-zA-Z_][a-zA-Z0-9_,\s]*)/);
    if (localMatch) {
      const names = localMatch[1].split(',').map((n) => n.trim());
      localVariables.push(...names);
    }

    // require() calls
    const requireMatch = line.match(/require\s*\(\s*["']([^"']+)["']\s*\)/);
    if (requireMatch) {
      requires.push(requireMatch[1]);
    }

    // msg.post calls
    const msgPostMatch = line.match(/msg\.post\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/);
    if (msgPostMatch) {
      msgPosts.push(`${msgPostMatch[1]} -> ${msgPostMatch[2]}`);
    }

    // go.* calls
    const goMatch = line.match(/go\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    if (goMatch) {
      goCalls.push(goMatch[1]);
    }

    // factory.create calls
    const factoryMatch = line.match(/factory\.create\s*\(\s*["']([^"']+)["']/);
    if (factoryMatch) {
      factoryCalls.push(factoryMatch[1]);
    }

    // collectionproxy.load / collectionproxy.create calls
    const proxyMatch = line.match(/collectionproxy\.(load|create|unload)\s*\(\s*["']([^"']+)["']/);
    if (proxyMatch) {
      collectionProxyCalls.push(`${proxyMatch[1]} -> ${proxyMatch[2]}`);
    }

    // hash() resource references
    const hashMatch = line.match(/hash\s*\(\s*["']([^"']+)["']\s*\)/g);
    if (hashMatch) {
      for (const m of hashMatch) {
        const inner = m.match(/["']([^"']+)["']/);
        if (inner) resourceReferences.push(inner[1]);
      }
    }

    // on_message handlers
    const onMessageMatch = line.match(/function\s+on_message\s*\(/);
    if (onMessageMatch) {
      onMessageHandlers.push('on_message');
    }

    // Very lightweight bracket balance check for obvious syntax issues
    const openBrackets = (line.match(/{/g) ?? []).length;
    const closeBrackets = (line.match(/}/g) ?? []).length;
    const openParens = (line.match(/\(/g) ?? []).length;
    const closeParens = (line.match(/\)/g) ?? []).length;
    if (openBrackets !== closeBrackets || openParens !== closeParens) {
      // This is a heuristic; only flag if line ends suspiciously.
      if (/^[\s{}()]*$/.test(line)) {
        syntaxIssues.push({
          line: lineNumber,
          severity: 'warning',
          message: 'Suspicious bracket/parenthesis balance on this line.',
        });
      }
    }
  }

  return {
    functions: unique(functions),
    localVariables: unique(localVariables),
    requires: unique(requires),
    msgPosts: unique(msgPosts),
    goCalls: unique(goCalls),
    factoryCalls: unique(factoryCalls),
    collectionProxyCalls: unique(collectionProxyCalls),
    resourceReferences: unique(resourceReferences),
    onMessageHandlers: unique(onMessageHandlers),
    syntaxIssues,
  };
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
