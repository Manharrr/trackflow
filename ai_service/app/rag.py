from langchain_huggingface import HuggingFaceEmbeddings
from langchain_postgres import PGVector

from app.config import (
    EMBEDDING_MODEL,
    RETRIEVAL_K,
    PGVECTOR_COLLECTION,
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DB,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
)


embeddings = HuggingFaceEmbeddings(
    model_name=EMBEDDING_MODEL
)


connection = (
    f"postgresql+psycopg://"
    f"{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}"
    f"/{POSTGRES_DB}"
)


db = PGVector(
    embeddings=embeddings,
    collection_name=PGVECTOR_COLLECTION,
    connection=connection,
    use_jsonb=True,
)


OVERFETCH_MULTIPLIER = 6


def retrieve_context(
    question: str,
    is_public: bool = False,
    k: int = RETRIEVAL_K,
) -> str:

    if is_public:

        candidates = db.similarity_search(
            question,
            k=k * OVERFETCH_MULTIPLIER,
        )

        public_docs = [
            doc
            for doc in candidates
            if doc.metadata.get("visibility") == "public"
        ][:k]

        return "\n\n".join(
            doc.page_content
            for doc in public_docs
        )

    results = db.similarity_search(
        question,
        k=k,
    )

    return "\n\n".join(
        doc.page_content
        for doc in results
    )
