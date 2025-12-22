"""Pydantic schemas for LanceDB tables."""

from typing import Literal

from pydantic import BaseModel, Field

EntityType = Literal["CHARACTER", "LOCATION", "EVENT", "OBJECT", "EMOTION"]

RelationType = Literal[
    # Character relations
    "LOVES",
    "HATES",
    "KNOWS",
    "RELATED_TO",
    "FRIENDS_WITH",
    "ENEMIES_WITH",
    # Spatial relations
    "LOCATED_IN",
    "LIVES_IN",
    "TRAVELS_TO",
    # Temporal relations
    "HAPPENS_BEFORE",
    "HAPPENS_AFTER",
    "CAUSES",
    # Object relations
    "OWNS",
    "USES",
    "SEEKS",
]


class ChapterRecord(BaseModel):
    """Schema for chapters.lance table."""

    # Identification
    id: str = Field(description="Unique ID: arc:episode:chapter")
    file_path: str = Field(description="Relative path to markdown file")
    file_hash: str = Field(description="SHA256 hash for change detection")

    # Hierarchy
    arc: str
    episode: int
    chapter: int

    # Metadata from frontmatter
    pov: str = Field(description="Point of view character")
    title: str
    location: str | None = None
    date: str | None = Field(default=None, description="Narrative date")

    # Content
    content: str = Field(description="Clean text without frontmatter/markdown")
    excerpt: str | None = Field(default=None, description="Short summary")

    # Statistics
    word_count: int
    char_count: int
    paragraph_count: int

    # RAG
    vector: list[float] = Field(description="768-dim embedding")
    entities: list[str] = Field(default_factory=list, description="Entity IDs")

    # Metadata
    indexed_at: int = Field(description="Unix timestamp")


class EntityRecord(BaseModel):
    """Schema for entities.lance table."""

    id: str = Field(description="Unique ID: type:name")
    name: str
    type: EntityType
    description: str
    aliases: list[str] = Field(default_factory=list)

    # RAG
    vector: list[float] = Field(description="Embedding of name+description")

    # References
    chapters: list[str] = Field(default_factory=list, description="Chapter IDs")
    chapter_count: int = 0
    first_appearance: str | None = None

    # Metadata
    indexed_at: int


class RelationRecord(BaseModel):
    """Schema for relations.lance table."""

    id: str = Field(description="Unique ID: source:type:target")
    source_entity: str = Field(description="Source entity ID")
    target_entity: str = Field(description="Target entity ID")
    type: str = Field(description="Relation type")
    description: str
    weight: float = Field(ge=0.0, le=1.0, description="Importance/frequency")

    # References
    chapters: list[str] = Field(default_factory=list)

    # Metadata
    indexed_at: int
