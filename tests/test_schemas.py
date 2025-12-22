"""Tests for database schemas."""

import pytest
from pydantic import ValidationError

from echoes_mcp.database.schemas import ChapterRecord, EntityRecord, RelationRecord


class TestChapterRecord:
    """Tests for ChapterRecord schema."""

    def test_valid_chapter(self):
        chapter = ChapterRecord(
            id="arc1:ep01:ch001",
            file_path="content/arc1/ep01/ch001.md",
            file_hash="abc123",
            arc="arc1",
            episode=1,
            chapter=1,
            pov="Alice",
            title="The Beginning",
            content="Chapter content here",
            word_count=100,
            char_count=500,
            paragraph_count=3,
            vector=[0.1] * 768,
            indexed_at=1234567890,
        )
        assert chapter.id == "arc1:ep01:ch001"
        assert chapter.pov == "Alice"

    def test_optional_fields(self):
        chapter = ChapterRecord(
            id="arc1:ep01:ch001",
            file_path="content/arc1/ep01/ch001.md",
            file_hash="abc123",
            arc="arc1",
            episode=1,
            chapter=1,
            pov="Alice",
            title="The Beginning",
            content="Content",
            word_count=100,
            char_count=500,
            paragraph_count=3,
            vector=[0.1] * 768,
            indexed_at=1234567890,
        )
        assert chapter.location is None
        assert chapter.excerpt is None


class TestEntityRecord:
    """Tests for EntityRecord schema."""

    def test_valid_character(self):
        entity = EntityRecord(
            id="character:alice",
            name="Alice",
            type="CHARACTER",
            description="The protagonist",
            vector=[0.1] * 768,
            indexed_at=1234567890,
        )
        assert entity.type == "CHARACTER"

    def test_invalid_type(self):
        with pytest.raises(ValidationError):
            EntityRecord(
                id="invalid:test",
                name="Test",
                type="INVALID_TYPE",  # type: ignore
                description="Test",
                vector=[0.1] * 768,
                indexed_at=1234567890,
            )

    def test_aliases_default_empty(self):
        entity = EntityRecord(
            id="character:bob",
            name="Bob",
            type="CHARACTER",
            description="A friend",
            vector=[0.1] * 768,
            indexed_at=1234567890,
        )
        assert entity.aliases == []


class TestRelationRecord:
    """Tests for RelationRecord schema."""

    def test_valid_relation(self):
        relation = RelationRecord(
            id="rel:alice:loves:bob",
            source_entity="character:alice",
            target_entity="character:bob",
            type="LOVES",
            description="Alice loves Bob",
            weight=0.9,
            indexed_at=1234567890,
        )
        assert relation.weight == 0.9

    def test_weight_bounds(self):
        with pytest.raises(ValidationError):
            RelationRecord(
                id="rel:test",
                source_entity="a",
                target_entity="b",
                type="KNOWS",
                description="Test",
                weight=1.5,  # Invalid: > 1.0
                indexed_at=1234567890,
            )
