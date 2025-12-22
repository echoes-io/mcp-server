"""Embedding model wrapper."""

import os
from functools import lru_cache

from sentence_transformers import SentenceTransformer

# Default model - best quality for Italian under 500M params
# Override with ECHOES_EMBEDDING_MODEL env var
# Options:
#   - google/gemma-embedding-gg-308m (best, requires HF_TOKEN)
#   - intfloat/multilingual-e5-base (good, no token needed)
#   - sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (fast, smaller)
DEFAULT_MODEL = os.getenv("ECHOES_EMBEDDING_MODEL", "intfloat/multilingual-e5-base")


@lru_cache(maxsize=1)
def get_embedding_model(model_name: str | None = None) -> SentenceTransformer:
    """Get cached embedding model."""
    model = model_name or DEFAULT_MODEL
    return SentenceTransformer(model)


def embed_texts(texts: list[str], model_name: str | None = None) -> list[list[float]]:
    """Embed multiple texts."""
    if not texts:
        return []

    model_name = model_name or DEFAULT_MODEL
    model = get_embedding_model(model_name)

    # E5 models need "passage: " prefix for documents
    if "e5" in model_name.lower():
        texts = [f"passage: {t}" for t in texts]

    embeddings = model.encode(texts, show_progress_bar=len(texts) > 10)
    return [emb.tolist() for emb in embeddings]


def embed_query(query: str, model_name: str | None = None) -> list[float]:
    """Embed a single query."""
    model_name = model_name or DEFAULT_MODEL
    model = get_embedding_model(model_name)

    # E5 models need "query: " prefix for queries
    if "e5" in model_name.lower():
        query = f"query: {query}"

    embedding = model.encode(query)
    return embedding.tolist()
