# Defold MCP

A production-quality [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that gives AI coding agents comprehensive control over a local Defold game-development project.

## What it does

Defold MCP exposes Defold projects through structured MCP tools so an AI agent can:

- Inspect project structure, settings, and resources
- Read, write, and patch Lua scripts and Defold text resources
- Search across the project
- Analyze Lua scripts and resource dependencies
- Modify collections, game objects, GUI files, and input bindings
- Validate Lua syntax and resource references
- Build and run the project through a local Defold installation
- Parse build errors and diagnostics

## Requirements

- Node.js 20+
- A Defold project with a `game.project` file
- (Optional) Defold editor/CLI for build/run integration

## Installation

```bash
npm install
npm run build
```

## Running the MCP

```bash
node dist/index.js --project "C:\Path\To\Your\Defold\Game"
```

Or with environment variables:

```bash
set DEFOLD_PROJECT_ROOT=C:\Path\To\Your\Defold\Game
set DEFOLD_MCP_LOG_LEVEL=info
node dist/index.js
```

## CLI options

```
defold-mcp [options]

Options:
  --project <path>      Path to the Defold project root
  --defold-path <path>  Path to the Defold installation/CLI
  --log-level <level>   debug | info | warn | error (default: info)
  --help, -h            Show help
  --version, -v         Show version
```

## MCP client configuration

### Claude Code / generic stdio

```json
{
  "mcpServers": {
    "defold": {
      "command": "node",
      "args": [
        "C:\\Path\\To\\defold-mcp\\dist\\index.js",
        "--project",
        "C:\\Path\\To\\MyDefoldGame"
      ]
    }
  }
}
```

### Cursor

Add a new MCP server in Cursor settings pointing to:

- Command: `node`
- Args: `C:\Path\To\defold-mcp\dist\index.js`, `--project`, `C:\Path\To\MyDefoldGame`

### VS Code

Use an MCP extension and configure a stdio server with the command above.

## Security model

- The server operates strictly inside the configured project root.
- All paths are resolved and validated against the project root.
- Path traversal, absolute paths outside the project, and symlink escapes are rejected.
- Destructive operations (`delete_file`, `remove_game_object`, etc.) require `confirm: true`.
- No arbitrary shell commands are exposed.
- Only processes started by `defold_run` can be stopped via `defold_stop`.

## Available tools

### Read-only

- `defold_get_project` — project info and Defold detection
- `defold_list_files` — list project files and directories
- `defold_read_file` — read a text file
- `defold_search` — search project text files
- `defold_analyze_lua` — analyze a Lua script
- `defold_read_collection` — read a collection structurally
- `defold_dependencies` — direct/reverse dependencies of a resource
- `defold_project_context` — compact AI-friendly project summary
- `defold_analyze_project` — project-wide analysis and issues
- `defold_get_input_bindings` — read input bindings
- `defold_get_build_errors` — parse build output
- `defold_git_status` — read-only Git status

### Write

- `defold_write_file`
- `defold_create_file`
- `defold_apply_patch`
- `defold_create_collection`
- `defold_add_game_object_to_collection`
- `defold_create_gui`
- `defold_create_gui_node`
- `defold_add_input_binding`

### Dangerous (require `confirm: true`)

- `defold_delete_file`
- `defold_remove_game_object_from_collection`

### Build / run

- `defold_build`
- `defold_run`
- `defold_stop`
- `defold_list_processes`

## Development

```bash
npm run dev      # watch build
npm test         # run unit + integration tests
npm run lint     # ESLint
npm run format   # Prettier
```

## Tests

The test suite includes:

- Path security and traversal tests
- Project detection and `game.project` parsing
- Collection parsing
- Lua editing and patch tests
- File creation and deletion confirmation tests
- Build command and error parsing tests
- Dependency analysis tests
- Optional integration tests that skip if Defold is not installed

## Windows notes

- Paths with spaces and backslashes are supported.
- Use Node's cross-platform APIs internally; no bash required.
- Configure `--defold-path` or `DEFOLD_PATH` if Defold is not on PATH.

## Known limitations

- Defold build integration relies on `bob.jar` being available. If only the editor executable is present, headless builds are limited.
- Lua analysis is lightweight regex-based; it is not a full AST parser.
- Some advanced Defold features (e.g., complex component properties) may require manual editing.

## Final acceptance test

The repository includes an automated acceptance path that exercises the core AI workflow:

```bash
npm test
```

This runs the full suite against `tests/fixtures/sample-project`, which performs:

1. Loads the sample Defold project.
2. Calls `defold_get_project` / `defold_project_context`.
3. Finds `player/player.script`.
4. Reads `player/player.script`.
5. Applies a focused patch to `player/player.script`.
6. Validates the project with `defold_validate`.
7. Builds the project with `defold_build` if Defold is installed.
8. Parses build results with `defold_get_build_errors`.
9. Reports changed files and diagnostics.

Integration tests are skipped cleanly when Defold is not installed, so the suite always passes.

## Recommended next features

- Full game object/component modification tools
- Sprite/atlas/tilesource creation helpers
- Deeper message flow analysis (`defold_find_messages`)
- Project indexing and caching for large projects
- HTTP/SSE transport support

## License

MIT
