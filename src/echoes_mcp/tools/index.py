"""Index tool - index timeline content into LanceDB."""

import time
from pathlib import Path
from typing import TypedDict

from rich.console import Console
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TaskProgressColumn,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
)

from ..database import Database
from ..indexer.embeddings import embed_texts
from ..indexer.scanner import ChapterFile, scan_content
from .words_count import count_paragraphs, count_words, strip_markdown


class IndexResult(TypedDict):
    """Result of index operation."""

    indexed: int
    updated: int
    deleted: int
    entities: int
    relations: int
    duration_seconds: float


def prepare_chapter_record(
    chapter: ChapterFile,
    vector: list[float],
) -> dict:
    """Prepare chapter record for LanceDB."""
    # Clean content for stats
    clean_content = strip_markdown(chapter["content"])

    return {
        "id": f"{chapter['arc']}:ep{chapter['episode']:02d}:ch{chapter['chapter']:03d}",
        "file_path": chapter["file_path"],
        "file_hash": chapter["file_hash"],
        "arc": chapter["arc"],
        "episode": chapter["episode"],
        "chapter": chapter["chapter"],
        "pov": chapter["pov"],
        "title": chapter["title"],
        "location": chapter["location"],
        "date": chapter["date"],
        "content": chapter["content"],
        "excerpt": chapter["excerpt"] or chapter["content"][:200],
        "word_count": count_words(clean_content),
        "char_count": len(clean_content),
        "paragraph_count": count_paragraphs(clean_content),
        "vector": vector,
        "entities": [],  # Will be populated by entity extraction
        "indexed_at": int(time.time()),
    }


async def index_timeline(
    content_path: str | Path,
    db_path: str | Path = ".lancedb",
    force: bool = False,
    arc_filter: str | None = None,
    quiet: bool = False,
) -> IndexResult:
    """
    Index timeline content into LanceDB.

    Args:
        content_path: Path to content directory
        db_path: Path to LanceDB database
        force: Force full re-index (ignore hashes)
        arc_filter: Only index this arc
        quiet: Suppress console output (for MCP server)
    """
    start_time = time.time()
    content_path = Path(content_path)
    db = Database(db_path)

    # Console output only if not quiet
    console = Console(quiet=quiet)

    # Scan filesystem
    console.print("[dim]Scanning files...[/dim]")
    chapters = scan_content(content_path)

    if arc_filter:
        chapters = [c for c in chapters if c["arc"] == arc_filter]

    console.print(f"[green]Found {len(chapters)} chapters[/green]")

    if not chapters:
        return IndexResult(
            indexed=0,
            updated=0,
            deleted=0,
            entities=0,
            relations=0,
            duration_seconds=time.time() - start_time,
        )

    # Get existing hashes for incremental indexing
    existing_hashes = {} if force else db.get_chapter_hashes()

    # Filter to only changed chapters
    to_index: list[ChapterFile] = []
    for chapter in chapters:
        existing_hash = existing_hashes.get(chapter["file_path"])
        if existing_hash != chapter["file_hash"]:
            to_index.append(chapter)

    # Find deleted chapters
    current_paths = {c["file_path"] for c in chapters}
    deleted_paths = [p for p in existing_hashes if p not in current_paths]

    if not to_index and not deleted_paths:
        console.print("[yellow]No changes detected[/yellow]")
        return IndexResult(
            indexed=0,
            updated=0,
            deleted=0,
            entities=0,
            relations=0,
            duration_seconds=time.time() - start_time,
        )

    console.print(f"[blue]Indexing {len(to_index)} chapters...[/blue]")

    # Generate embeddings for chapters to index
    records = []
    if to_index:
        texts = [c["content"][:2000] for c in to_index]

        if quiet:
            # No progress bar for MCP server
            vectors = embed_texts(texts)
        else:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TaskProgressColumn(),
                MofNCompleteColumn(),
                TimeElapsedColumn(),
                TextColumn("ETA:"),
                TimeRemainingColumn(),
                console=console,
            ) as progress:
                task = progress.add_task("Embedding", total=len(texts))

                def update_progress(completed: int, _total: int) -> None:
                    progress.update(task, completed=completed)

                vectors = embed_texts(texts, progress_callback=update_progress)

        # Prepare records
        for chapter, vector in zip(to_index, vectors, strict=True):
            records.append(prepare_chapter_record(chapter, vector))

    # Count new vs updated
    indexed = sum(1 for r in records if r["file_path"] not in existing_hashes)
    updated = len(records) - indexed

    # Save to database
    if records:
        console.print("[dim]Saving to database...[/dim]")
        db.upsert_chapters(records)

    # Delete removed chapters
    deleted = 0
    if deleted_paths:
        deleted = db.delete_chapters_by_paths(deleted_paths)

    return IndexResult(
        indexed=indexed,
        updated=updated,
        deleted=deleted,
        entities=0,  # TODO: implement entity extraction
        relations=0,  # TODO: implement relation extraction
        duration_seconds=round(time.time() - start_time, 2),
    )
