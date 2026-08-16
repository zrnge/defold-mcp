# Defold MCP Security

## Project sandbox

The server is configured with a single project root. Every filesystem operation is restricted to this root.

## Path resolution

`resolveProjectPath` in `src/security/paths.ts`:

1. Resolves the requested path.
2. Resolves symlinks.
3. Normalizes both candidate and project root.
4. Verifies containment (case-insensitive on Windows).
5. Returns the normalized absolute path or a `PATH_TRAVERSAL` error.

## Rejected paths

- `../` traversal
- Absolute paths outside the project root
- Windows paths escaping the project drive/directory
- Symlink escapes where resolvable

## Dangerous operations

Tools that delete or remove data require `confirm: true`:

- `defold_delete_file`
- `defold_remove_game_object_from_collection`

## No arbitrary execution

There is no generic `run_command` tool. Process execution is limited to:

- `defold_build` — constructs a Defold bob.jar command internally
- `defold_run` — launches the configured Defold editor with the project
- `defold_stop` — only kills processes started by `defold_run`

## Git

`defold_git_status` is read-only. The MCP never commits or pushes.

## Logging

All logs go to stderr. stdout is reserved for MCP stdio protocol messages.
