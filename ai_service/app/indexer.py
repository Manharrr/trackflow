from langchain_huggingface import HuggingFaceEmbeddings
from langchain_postgres import PGVector
from langchain_core.documents import Document

from app.config import (
    PROJECT_SOURCE_DIRS,
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

    if not PROJECT_SOURCE_DIRS:
        print("PROJECT_SOURCE_DIRS is empty.")
        return

    print("Scanning project files...")

    documents = load_documents(PROJECT_SOURCE_DIRS)

    if not documents:
        print("No documents found.")
        return

    chunks = chunk_documents(documents)

    print("Building embeddings...")

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

    print("Storing documents in PGVector...")

    db.add_documents(lc_documents)

    print(
        f"Index created successfully in PostgreSQL "
        f"collection '{PGVECTOR_COLLECTION}'"
    )


if __name__ == "__main__":
    build_index()
