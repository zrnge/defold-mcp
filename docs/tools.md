# Defold MCP Tools

## Project

### `defold_get_project`

Returns project information: path, name, version, dependencies, display/input/render settings, bootstrap collection, files, and Defold engine availability.

## Filesystem

### `defold_list_files`

```json
{
  "path": ".",
  "recursive": true,
  "includeHidden": false,
  "extensions": [".lua", ".script"]
}
```

### `defold_read_file`

```json
{ "path": "player/player.script" }
```

### `defold_write_file`

```json
{
  "path": "player/player.script",
  "content": "local speed = 200",
  "backup": true
}
```

### `defold_create_file`

```json
{
  "path": "enemy/enemy.script",
  "content": "function init(self)\nend\n"
}
```

### `defold_delete_file`

```json
{ "path": "old/old.script", "confirm": true }
```

### `defold_search`

```json
{
  "query": "player",
  "path": ".",
  "recursive": true,
  "extensions": [".lua", ".script", ".collection"],
  "maxResults": 100
}
```

### `defold_apply_patch`

```json
{
  "path": "player/player.script",
  "operation": "replace",
  "oldText": "local speed = 100",
  "newText": "local speed = 200"
}
```

Operations: `replace`, `insert_after`, `insert_before`, `replace_lines`, `delete_lines`.

## Analysis

### `defold_analyze_lua`

```json
{ "path": "player/player.script" }
```

Returns functions, local variables, requires, `msg.post` calls, `go.*` calls, factory/collectionproxy calls, resource references, and syntax issues.

### `defold_validate`

```json
{ "path": "player/player.script" }
```

Validates Lua syntax and resource references. Omit `path` to validate the whole project.

### `defold_dependencies`

```json
{ "path": "player/player.go" }
```

Returns direct and reverse dependencies.

### `defold_project_context`

Returns a compact AI-friendly summary of the project.

### `defold_analyze_project`

Analyzes the project and reports duplicate IDs, missing resources, and structure.

## Collections

### `defold_read_collection`

```json
{ "path": "main/main.collection" }
```

### `defold_create_collection`

```json
{ "path": "levels/level1.collection", "name": "level1" }
```

### `defold_add_game_object_to_collection`

```json
{
  "collection": "main/main.collection",
  "id": "enemy",
  "position": { "x": 200, "y": 200, "z": 0 }
}
```

### `defold_remove_game_object_from_collection`

```json
{
  "collection": "main/main.collection",
  "id": "enemy",
  "confirm": true
}
```

## GUI

### `defold_create_gui`

```json
{
  "path": "hud/hud.gui",
  "script": "/hud/hud.gui_script"
}
```

### `defold_create_gui_node`

```json
{
  "gui": "hud/hud.gui",
  "id": "score",
  "type": "text",
  "position": { "x": 50, "y": 700, "z": 0 },
  "text": "Score: 0"
}
```

## Input

### `defold_get_input_bindings`

Returns all input bindings.

### `defold_add_input_binding`

```json
{
  "action": "dash",
  "input": "KEY_LEFT_SHIFT",
  "type": "key"
}
```

## Build / Run

### `defold_build`

```json
{
  "platform": "desktop",
  "configuration": "debug"
}
```

### `defold_run`

```json
{ "configuration": "debug" }
```

### `defold_stop`

```json
{ "processId": 12345 }
```

### `defold_list_processes`

Lists processes started by `defold_run`.

### `defold_get_build_errors`

```json
{ "output": "player/player.script:42: attempt to index nil" }
```

Parses build output into structured diagnostics.

## Git

### `defold_git_status`

Returns current branch, modified, staged, and untracked files. Read-only.
