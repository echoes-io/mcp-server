"""Embedding model wrapper."""

from functools import lru_cache

from sentence_transformers import SentenceTransformer

# Default model - good for Italian, reasonable size
DEFAULT_MODEL = "intfloat/multilingual-e5-base"


@lru_cache(maxsize=1)
def get_embedding_model(model_name: str = DEFAULT_MODEL) -> SentenceTransformer:
    """Get cached embedding model."""
    return SentenceTransformer(model_name)


def embed_texts(texts: list[str], model_name: str = DEFAULT_MODEL) -> list[list[float]]:
    """Embed multiple texts."""
    if not texts:
        return []

    model = get_embedding_model(model_name)

    # E5 models need "passage: " prefix for documents
    if "e5" in model_name.lower():
        texts = [f"passage: {t}" for t in texts]

    embeddings = model.encode(texts, show_progress_bar=len(texts) > 10)
    return [emb.tolist() for emb in embeddings]


def embed_query(query: str, model_name: str = DEFAULT_MODEL) -> list[float]:
    """Embed a single query."""
    model = get_embedding_model(model_name)

    # E5 models need "query: " prefix for queries
    if "e5" in model_name.lower():
        query = f"query: {query}"

    embedding = model.encode(query)
    return embedding.tolist()
