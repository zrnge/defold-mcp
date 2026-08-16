# Defold MCP Architecture

## Overview

Defold MCP is a TypeScript Node.js server implementing the Model Context Protocol. It exposes Defold project operations as MCP tools, resources, and prompts.

## Directory structure

```
src/
  index.ts          # CLI entry point
  server.ts         # MCP server setup and tool routing
  config.ts         # Configuration loading from CLI/env
  security/
    paths.ts        # Project-root path resolution and traversal protection
  defold/
    parser.ts       # Lightweight Defold text-format parser
    lua.ts          # Lightweight Lua script analyzer
    build.ts         # Defold build invocation and output parsing
    process.ts       # Game process launch/stop registry
    dependencies.ts  # Resource dependency graph
    input.ts         # Input binding parsing and editing
  tools/
    project.ts       # defold_get_project
    filesystem.ts    # file/list/search/patch tools
    analysis.ts      # analyze/validate/dependencies/project_context
    build.ts         # defold_build / defold_get_build_errors
    collections.ts   # collection/game-object tools
    gui.ts           # GUI creation/modification
    input.ts         # input binding tools
    run.ts           # run/stop/list processes
    git.ts           # read-only Git status
  utils/
    logger.ts        # stderr-only structured logging
    errors.ts        # error codes and helpers
    files.ts         # safe text file operations
    project.ts       # project file listing and game.project parsing
    search.ts        # project text search
    patch.ts         # patch operations and lightweight Lua validation
  types/
    index.ts         # shared TypeScript types
```

## Security

All filesystem operations go through `createPathResolver`, which:

1. Resolves the requested path relative to the project root.
2. Resolves symlinks where possible.
3. Verifies the final path is inside the project root (case-insensitive on Windows).
4. Rejects traversal attempts and absolute paths outside the root.

## Transport

The primary transport is stdio via `@modelcontextprotocol/sdk`. The core logic is transport-agnostic so HTTP/SSE can be added later.

## Tool routing

`server.ts` registers all tools, validates input with Zod, dispatches to the appropriate tool module, and returns structured JSON responses.

## Logging

All logs are written to `stderr` as JSON lines. The `DEFOLD_MCP_LOG_LEVEL` environment variable controls verbosity. Nothing is logged to stdout during MCP operation.
