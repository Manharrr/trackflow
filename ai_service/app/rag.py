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

# from langchain_huggingface import HuggingFaceEmbeddings
# from langchain_community.vectorstores import FAISS

# from app.config import FAISS_INDEX_PATH, EMBEDDING_MODEL, RETRIEVAL_K

# embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

# db = FAISS.load_local(
#     FAISS_INDEX_PATH,
#     embeddings,
#     allow_dangerous_deserialization=True,
# )

# # How many extra candidates to pull before filtering, so that after removing
# # internal-only chunks we still have close to k relevant public chunks left.
# # Public docs are usually a small fraction of the index, so over-fetch generously.
# OVERFETCH_MULTIPLIER = 6


# def retrieve_context(question: str, is_public: bool = False, k: int = RETRIEVAL_K) -> str:
#     """
#     Retrieve relevant context for the RAG prompt.

#     SECURITY: when is_public=True, internal-only chunks (source code, config,
#     schemas, etc — anything tagged visibility="internal" at indexing time in
#     loader.py) are filtered out HERE, before anything is ever assembled into
#     a prompt or returned to the caller. This is the enforcement point — the
#     LLM instructions in llm.py are a second layer, not the only layer.
#     """
#     if is_public:
#         # Over-fetch since most of the index is internal; we need enough
#         # public-tagged candidates left after filtering.
#         candidates = db.similarity_search(question, k=k * OVERFETCH_MULTIPLIER)
#         public_docs = [
#             doc for doc in candidates
#             if doc.metadata.get("visibility") == "public"
#         ][:k]
#         return "\n\n".join(doc.page_content for doc in public_docs)

#     # Internal/project-knowledge mode: full index is searchable.
#     results = db.similarity_search(question, k=k)
#     return "\n\n".join(doc.page_content for doc in results)
