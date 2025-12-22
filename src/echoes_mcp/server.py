"""MCP Server for Echoes."""

import asyncio
import json
from pathlib import Path

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

from .database import Database
from .indexer import embed_query
from .tools import index_timeline, search_semantic, stats, words_count

# Initialize server
server = Server("echoes-mcp-server")

# Database path from cwd
DB_PATH = Path.cwd() / "lancedb"


def get_db() -> Database:
    """Get database connection."""
    return Database(DB_PATH)


@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools."""
    return [
        Tool(
            name="words-count",
            description="Count words and statistics in a markdown file",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {"type": "string", "description": "Path to markdown file"},
                },
                "required": ["file"],
            },
        ),
        Tool(
            name="stats",
            description="Get aggregate statistics from the database",
            inputSchema={
                "type": "object",
                "properties": {
                    "arc": {"type": "string", "description": "Filter by arc"},
                    "episode": {"type": "integer", "description": "Filter by episode"},
                    "pov": {"type": "string", "description": "Filter by POV character"},
                },
            },
        ),
        Tool(
            name="index",
            description="Index timeline content into LanceDB",
            inputSchema={
                "type": "object",
                "properties": {
                    "content_path": {"type": "string", "description": "Path to content directory"},
                    "force": {"type": "boolean", "description": "Force full re-index"},
                    "arc": {"type": "string", "description": "Index only this arc"},
                },
                "required": ["content_path"],
            },
        ),
        Tool(
            name="search-semantic",
            description="Semantic search on chapters",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "arc": {"type": "string", "description": "Filter by arc"},
                    "episode": {"type": "integer", "description": "Filter by episode"},
                    "pov": {"type": "string", "description": "Filter by POV"},
                    "limit": {"type": "integer", "description": "Max results", "default": 10},
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="search-entities",
            description="Search entities (characters, locations, events)",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "name": {"type": "string", "description": "Exact name match"},
                    "type": {
                        "type": "string",
                        "description": "Entity type",
                        "enum": ["CHARACTER", "LOCATION", "EVENT", "OBJECT", "EMOTION"],
                    },
                    "limit": {"type": "integer", "description": "Max results", "default": 10},
                },
            },
        ),
        Tool(
            name="search-relations",
            description="Search relations between entities",
            inputSchema={
                "type": "object",
                "properties": {
                    "entity": {"type": "string", "description": "Find relations of this entity"},
                    "source": {"type": "string", "description": "Source entity"},
                    "target": {"type": "string", "description": "Target entity"},
                    "type": {"type": "string", "description": "Relation type"},
                    "limit": {"type": "integer", "description": "Max results", "default": 10},
                },
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls."""
    try:
        match name:
            case "words-count":
                result = words_count(arguments["file"])
                return [TextContent(type="text", text=json.dumps(result, indent=2))]

            case "stats":
                db = get_db()
                result = await stats(
                    db,
                    arc=arguments.get("arc"),
                    episode=arguments.get("episode"),
                    pov=arguments.get("pov"),
                )
                return [TextContent(type="text", text=json.dumps(result, indent=2))]

            case "index":
                result = await index_timeline(
                    arguments["content_path"],
                    DB_PATH,
                    force=arguments.get("force", False),
                    arc_filter=arguments.get("arc"),
                )
                return [TextContent(type="text", text=json.dumps(result, indent=2))]

            case "search-semantic":
                db = get_db()
                query_vector = embed_query(arguments["query"])
                results = await search_semantic(
                    db,
                    query_vector,
                    arc=arguments.get("arc"),
                    episode=arguments.get("episode"),
                    pov=arguments.get("pov"),
                    limit=arguments.get("limit", 10),
                )
                return [TextContent(type="text", text=json.dumps(results, indent=2))]

            case "search-entities":
                # TODO: Implement with embeddings
                return [TextContent(type="text", text="Not implemented yet")]

            case "search-relations":
                # TODO: Implement
                return [TextContent(type="text", text="Not implemented yet")]

            case _:
                return [TextContent(type="text", text=f"Unknown tool: {name}")]

    except Exception as e:
        return [TextContent(type="text", text=f"Error: {e}")]


async def run_server() -> None:
    """Run the MCP server with stdio transport."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


def main() -> None:
    """Run the MCP server."""
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
