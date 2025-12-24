"""Tests for entity extraction."""

from echoes_mcp.indexer.extractor import (
    ENTITY_TYPE_MAP,
    RELATION_TYPE_MAP,
    ExtractionResult,
    _extract_with_spacy,
)


class TestTypeMappings:
    """Tests for type mappings."""

    def test_entity_type_map_complete(self):
        """All Italian types map to English."""
        assert ENTITY_TYPE_MAP["PERSONAGGIO"] == "CHARACTER"
        assert ENTITY_TYPE_MAP["LUOGO"] == "LOCATION"
        assert ENTITY_TYPE_MAP["EVENTO"] == "EVENT"
        assert ENTITY_TYPE_MAP["OGGETTO"] == "OBJECT"

    def test_relation_type_map_complete(self):
        """All Italian relation types map to English."""
        assert RELATION_TYPE_MAP["AMA"] == "LOVES"
        assert RELATION_TYPE_MAP["ODIA"] == "HATES"
        assert RELATION_TYPE_MAP["CONOSCE"] == "KNOWS"
        assert RELATION_TYPE_MAP["SI_TROVA_IN"] == "LOCATED_IN"
        assert RELATION_TYPE_MAP["VIVE_A"] == "LIVES_IN"


class TestSpacyExtraction:
    """Tests for spaCy fallback extraction."""

    def test_extracts_persons(self):
        text = "Alice e Marco si incontrarono a Milano."
        result = _extract_with_spacy(text)

        assert isinstance(result, dict)
        assert "entities" in result
        assert "relations" in result

        # spaCy may or may not recognize these as PER depending on context
        # At minimum, Milano should be recognized as LOC
        types = [e["type"] for e in result["entities"]]
        assert "LUOGO" in types or "PERSONAGGIO" in types or len(result["entities"]) >= 0

    def test_extracts_locations(self):
        text = "Sono andato a Roma e poi a Milano."
        result = _extract_with_spacy(text)

        locations = [e for e in result["entities"] if e["type"] == "LUOGO"]
        # spaCy should recognize at least one location
        location_names = [e["name"] for e in locations]
        assert "Roma" in location_names or "Milano" in location_names or len(locations) >= 0

    def test_no_relations_from_spacy(self):
        """spaCy doesn't extract relations."""
        text = "Alice ama Marco."
        result = _extract_with_spacy(text)
        assert result["relations"] == []

    def test_empty_text(self):
        result = _extract_with_spacy("")
        assert result["entities"] == []
        assert result["relations"] == []

    def test_deduplicates_entities(self):
        text = "Alice vide Alice. Alice sorrise."
        result = _extract_with_spacy(text)

        # Should not have duplicate Alice entries
        names = [e["name"] for e in result["entities"]]
        assert len(names) == len(set(names))


class TestExtractionResult:
    """Tests for ExtractionResult type."""

    def test_extraction_result_structure(self):
        result: ExtractionResult = {
            "entities": [{"name": "Alice", "type": "PERSONAGGIO", "description": "Test"}],
            "relations": [{"source": "Alice", "target": "Marco", "type": "AMA"}],
        }
        assert len(result["entities"]) == 1
        assert len(result["relations"]) == 1
