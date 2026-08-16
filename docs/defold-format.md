# Defold Text Formats

Defold stores many resources as text files with a Lua-like nested table syntax.

Examples:

- `game.project` — INI-style project settings
- `.collection` — scenes and game object instances
- `.go` — game object prototypes
- `.gui` — GUI layouts
- `.script`, `.gui_script`, `.lua` — Lua source
- `.sprite`, `.atlas`, `.tilesource`, `.input_binding`, etc.

## Parsing approach

The MCP uses a lightweight line-based parser in `src/defold/parser.ts` that:

- Recognizes blocks `{ ... }`
- Extracts key-value properties
- Preserves formatting when writing back

This is sufficient for structural reads and focused edits. It is not a full Defold protobuf/text-format parser and may need extension for very complex resources.

## Safety

For text-based resources, the MCP preserves formatting and creates backups before modifications. Binary assets (images, audio, models) are not edited by the MCP.
