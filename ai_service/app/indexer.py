from langchain_huggingface import HuggingFaceEmbeddings
from langchain_postgres import PGVector
from langchain_core.documents import Document

from app.config import (
    PROJECT_DOCS_DIRS,
    EMBEDDING_MODEL,
    PGVECTOR_COLLECTION,
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DB,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
)

from app.loader import load_documents
from app.chunker import chunk_documents


def build_index():
    if not PROJECT_DOCS_DIRS:
        print("[RAG Ingestion] PROJECT_DOCS_DIRS is empty. No directories configured.")
        return

    print(f"[RAG Ingestion] Ingesting documentation from: {PROJECT_DOCS_DIRS}")

    documents = load_documents(PROJECT_DOCS_DIRS)

    if not documents:
        print("[RAG Ingestion] No valid documentation (.md, .pdf) found.")
        return

    chunks = chunk_documents(documents)

    print(f"[RAG Ingestion] Generating embeddings with model: {EMBEDDING_MODEL}")

    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL
    )

    lc_documents = [
        Document(
            page_content=c["content"],
            metadata=c["metadata"],
        )
        for c in chunks
    ]

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

    print(f"[RAG Ingestion] Clearing existing PGVector collection '{PGVECTOR_COLLECTION}'...")
    try:
        db.delete_collection()
    except Exception as e:
        print(f"[RAG Ingestion] Note on collection reset: {e}")

    try:
        db.create_collection()
    except Exception as e:
        pass

    print(f"[RAG Ingestion] Storing {len(lc_documents)} documentation chunks in PGVector...")
    db.add_documents(lc_documents)

    print(
        f"[RAG Ingestion] Index successfully created in PostgreSQL "
        f"collection '{PGVECTOR_COLLECTION}' with {len(lc_documents)} documentation chunks."
    )


if __name__ == "__main__":
    build_index()
