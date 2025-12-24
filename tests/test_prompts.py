"""Tests for prompts module."""

import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from echoes_mcp.prompts import get_prompt, list_prompts
from echoes_mcp.prompts.validation import (
    get_available_arcs,
    validate_arc_exists,
    validate_arc_not_exists,
    validate_is_number,
)


class TestListPrompts:
    """Tests for list_prompts."""

    def test_returns_all_prompts(self):
        result = list_prompts()
        assert "prompts" in result
        assert len(result["prompts"]) == 6

    def test_prompt_names(self):
        result = list_prompts()
        names = [p["name"] for p in result["prompts"]]
        assert "new-chapter" in names
        assert "revise-chapter" in names
        assert "expand-chapter" in names
        assert "new-character" in names
        assert "new-episode" in names
        assert "new-arc" in names

    def test_prompts_have_arguments(self):
        result = list_prompts()
        for prompt in result["prompts"]:
            assert "arguments" in prompt
            assert isinstance(prompt["arguments"], list)


class TestValidation:
    """Tests for validation utilities."""

    def test_validate_is_number_valid(self):
        assert validate_is_number("1")
        assert validate_is_number("123")
        assert validate_is_number("0")

    def test_validate_is_number_invalid(self):
        assert not validate_is_number("abc")
        assert not validate_is_number("1.5")
        assert not validate_is_number("")
        assert not validate_is_number("-1")

    def test_get_available_arcs(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            content = Path(tmpdir)
            (content / "arc1").mkdir()
            (content / "arc2").mkdir()
            (content / ".hidden").mkdir()

            arcs = get_available_arcs(content)
            assert arcs == ["arc1", "arc2"]

    def test_get_available_arcs_empty(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            arcs = get_available_arcs(Path(tmpdir))
            assert arcs == []

    def test_validate_arc_exists(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            content = Path(tmpdir)
            (content / "work").mkdir()

            assert validate_arc_exists("work", content)
            assert not validate_arc_exists("nonexistent", content)

    def test_validate_arc_not_exists(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            content = Path(tmpdir)
            (content / "work").mkdir()

            assert not validate_arc_not_exists("work", content)
            assert validate_arc_not_exists("new-arc", content)


class TestGetPrompt:
    """Tests for get_prompt."""

    @pytest.fixture
    def content_with_arc(self):
        """Create content dir with an arc."""
        with tempfile.TemporaryDirectory() as tmpdir:
            content = Path(tmpdir) / "content"
            (content / "work").mkdir(parents=True)
            yield content

    def test_missing_github_repo(self, content_with_arc):
        """Test error when .github repo not found."""
        with (
            patch.object(Path, "exists", return_value=False),
            patch(
                "echoes_mcp.prompts.handlers.validate_github_repo",
                return_value={"exists": False, "path": "/fake/.github/.kiro/prompts"},
            ),
        ):
            result = get_prompt(
                "new-chapter", {"arc": "work", "chapter": "1"}, "test", content_with_arc
            )
            text = result["messages"][0]["content"]["text"]
            assert "Error" in text
            assert ".github" in text

    def test_invalid_arc(self, content_with_arc):
        """Test error for non-existent arc."""
        result = get_prompt(
            "new-chapter", {"arc": "nonexistent", "chapter": "1"}, "test", content_with_arc
        )
        text = result["messages"][0]["content"]["text"]
        assert "Error" in text
        assert "nonexistent" in text
        assert "not found" in text

    def test_invalid_chapter_number(self, content_with_arc):
        """Test error for non-numeric chapter."""
        result = get_prompt(
            "new-chapter", {"arc": "work", "chapter": "abc"}, "test", content_with_arc
        )
        text = result["messages"][0]["content"]["text"]
        assert "Error" in text
        assert "must be a number" in text

    def test_new_arc_already_exists(self, content_with_arc):
        """Test error when creating arc that exists."""
        result = get_prompt("new-arc", {"name": "work"}, "test", content_with_arc)
        text = result["messages"][0]["content"]["text"]
        assert "Error" in text
        assert "already exists" in text

    def test_missing_required_arg(self, content_with_arc):
        """Test error for missing required argument."""
        result = get_prompt("new-chapter", {"arc": "work"}, "test", content_with_arc)
        text = result["messages"][0]["content"]["text"]
        assert "Error" in text
        assert "Missing" in text

    def test_successful_prompt_loading(self):
        """Test successful prompt loading with mocked .github."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create content with arc
            content = Path(tmpdir) / "content"
            (content / "work").mkdir(parents=True)

            # Create fake .github prompts
            github_prompts = Path(tmpdir) / ".github" / ".kiro" / "prompts"
            github_prompts.mkdir(parents=True)
            (github_prompts / "new-chapter.md").write_text(
                "# Test Prompt\n\nArc: {ARC}, Chapter: {CHAPTER}, Timeline: {TIMELINE}"
            )

            with patch(
                "echoes_mcp.prompts.handlers.validate_github_repo",
                return_value={"exists": True, "path": str(github_prompts)},
            ):
                result = get_prompt(
                    "new-chapter", {"arc": "work", "chapter": "1"}, "test-timeline", content
                )
                text = result["messages"][0]["content"]["text"]

                # Check placeholders were substituted
                assert "Arc: work" in text
                assert "Chapter: 1" in text
                assert "Timeline: test-timeline" in text
                assert "{ARC}" not in text  # Placeholder should be replaced
