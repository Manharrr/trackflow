from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import CHUNK_SIZE, CHUNK_OVERLAP

CODE_SEPARATORS = ["\nclass ", "\ndef ", "\n\n", "\n", " ", ""]


def chunk_documents(documents: list[dict]) -> list[dict]:
    """Split documents into chunks while preserving metadata."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=CODE_SEPARATORS,
    )

    chunks = []
    for doc in documents:
        pieces = splitter.split_text(doc["content"])
        for piece in pieces:
            chunks.append({"content": piece, "metadata": doc["metadata"]})

    print(f"Created {len(chunks)} chunks")
    return chunks