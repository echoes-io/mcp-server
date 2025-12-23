"""Filesystem scanner for timeline content."""

import hashlib
import re
from pathlib import Path
from typing import TypedDict

import yaml


class ChapterFile(TypedDict):
    """Parsed chapter file data."""

    file_path: str
    file_hash: str
    arc: str
    episode: int
    chapter: int
    pov: str
    title: str
    location: str | None
    date: str | None
    excerpt: str | None
    content: str


def compute_hash(content: str) -> str:
    """Compute SHA256 hash of content."""
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter and return (metadata, body)."""
    if not content.startswith("---"):
        return {}, content

    end = content.find("---", 3)
    if end == -1:
        return {}, content

    frontmatter = content[3:end].strip()
    body = content[end + 3 :].strip()

    try:
        metadata = yaml.safe_load(frontmatter) or {}
    except yaml.YAMLError:
        metadata = {}

    return metadata, body


def extract_chapter_info(file_path: Path, base_path: Path) -> ChapterFile | None:
    """Extract chapter info from markdown file."""
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception:
        return None

    metadata, body = parse_frontmatter(content)

    # Extract from path: content/arc-name/ep01-title/ep01-ch001-pov-title.md
    rel_path = file_path.relative_to(base_path)
    parts = rel_path.parts

    if len(parts) < 3:
        return None

    arc = parts[0]

    # Parse episode from folder name (ep01-title -> 1)
    ep_match = re.match(r"ep(\d+)", parts[1])
    episode = int(ep_match.group(1)) if ep_match else metadata.get("episode", 1)

    # Parse chapter from filename (ep01-ch001-pov-title.md -> 1)
    ch_match = re.match(r"ep\d+-ch(\d+)", file_path.stem)
    chapter = int(ch_match.group(1)) if ch_match else metadata.get("chapter", 1)

    # Get POV from metadata or filename (normalized to lowercase)
    pov = metadata.get("pov", "")
    if not pov and ch_match:
        # Try to extract from filename: ep01-ch001-alice-title.md
        name_parts = file_path.stem.split("-")
        if len(name_parts) >= 3:
            pov = name_parts[2]
    pov = pov.lower() if pov else "unknown"

    return ChapterFile(
        file_path=str(rel_path),
        file_hash=compute_hash(content),
        arc=arc,
        episode=episode,
        chapter=chapter,
        pov=pov,
        title=metadata.get("title", file_path.stem),
        location=metadata.get("location"),
        date=metadata.get("date"),
        excerpt=metadata.get("excerpt"),
        content=body,
    )


def scan_content(content_path: Path) -> list[ChapterFile]:
    """Scan content directory for markdown files."""
    chapters: list[ChapterFile] = []

    for md_file in content_path.rglob("*.md"):
        # Skip non-chapter files
        if md_file.name.startswith("_") or md_file.name == "README.md":
            continue

        chapter = extract_chapter_info(md_file, content_path)
        if chapter:
            chapters.append(chapter)

    # Sort by arc, episode, chapter
    chapters.sort(key=lambda c: (c["arc"], c["episode"], c["chapter"]))
    return chapters
