"""Entity and relation extraction using LlamaIndex PropertyGraphIndex."""

from llama_index.core import Document, PropertyGraphIndex, Settings
from llama_index.core.indices.property_graph import SchemaLLMPathExtractor
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

from .embeddings import DEFAULT_MODEL

# Entity types for narrative content
ENTITY_TYPES = [
    "PERSONAGGIO",  # Characters
    "LUOGO",  # Locations
    "EVENTO",  # Events
    "OGGETTO",  # Objects
]

# Relation types for narrative content
RELATION_TYPES = [
    # Character relations
    "AMA",
    "ODIA",
    "CONOSCE",
    "PARENTE_DI",
    "AMICO_DI",
    # Spatial relations
    "SI_TROVA_IN",
    "VIVE_A",
    "VA_A",
    # Temporal/causal relations
    "CAUSA",
    "PRECEDE",
    "SEGUE",
    # Object relations
    "POSSIEDE",
    "USA",
]


def setup_llm_settings() -> None:
    """Configure LlamaIndex settings for local/API LLM."""
    # Use HuggingFace embeddings (local, no API needed)
    Settings.embed_model = HuggingFaceEmbedding(model_name=DEFAULT_MODEL)

    # LLM will be configured per-call or use default
    # For now, we'll skip LLM-based extraction and use simpler methods


def extract_entities_simple(pov: str) -> list[dict]:
    """Simple entity extraction without LLM (fallback)."""
    entities = []

    # Always add POV as character
    if pov and pov != "Unknown":
        entities.append(
            {
                "name": pov,
                "type": "CHARACTER",
                "description": "POV character",
            }
        )

    return entities


def create_property_graph_index(
    documents: list[Document],
    use_llm: bool = False,
) -> PropertyGraphIndex:
    """
    Create PropertyGraphIndex from documents.

    Args:
        documents: List of LlamaIndex documents
        use_llm: Whether to use LLM for entity extraction (requires API key)
    """
    setup_llm_settings()

    if use_llm:
        # Full extraction with LLM
        kg_extractor = SchemaLLMPathExtractor(
            possible_entities=ENTITY_TYPES,
            possible_relations=RELATION_TYPES,
            strict=False,
        )
        index = PropertyGraphIndex.from_documents(
            documents,
            kg_extractors=[kg_extractor],
            show_progress=True,
        )
    else:
        # Simple index without LLM extraction
        index = PropertyGraphIndex.from_documents(
            documents,
            kg_extractors=[],  # No extractors = just embed documents
            show_progress=True,
        )

    return index
