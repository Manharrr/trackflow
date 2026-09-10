from dotenv import load_dotenv
import os

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
# FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "faiss_index")

PGVECTOR_COLLECTION = os.getenv(
    "PGVECTOR_COLLECTION",
    "trackflow_documents",
)

PROJECT_SOURCE_DIRS = [
    p.strip() for p in os.getenv("PROJECT_SOURCE_DIRS", "").split(",") if p.strip()
]

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 500))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 50))
RETRIEVAL_K = int(os.getenv("RETRIEVAL_K", 5))


POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "Logestic_Go")
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")

PGVECTOR_COLLECTION = os.getenv(
    "PGVECTOR_COLLECTION",
    "trackflow_documents",
)