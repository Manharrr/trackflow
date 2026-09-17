from dotenv import load_dotenv
import os

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "faiss_index")

PGVECTOR_COLLECTION = os.getenv(
    "PGVECTOR_COLLECTION",
    "trackflow_documents",
)

# Dedicated documentation directories (Only documentation: .md and .pdf)
raw_docs_dirs = os.getenv("DOCS_DIR") or os.getenv("PROJECT_DOCS_DIRS") or os.getenv("PROJECT_SOURCE_DIRS", "")
PROJECT_DOCS_DIRS = [p.strip() for p in raw_docs_dirs.split(",") if p.strip()]

if not PROJECT_DOCS_DIRS:
    base_ai_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    candidates = [
        os.path.join(base_ai_dir, "documents"),
        "/app/documents",
        os.path.join(os.path.dirname(base_ai_dir), "backend", "docs"),
        "/project-source/backend/docs",
    ]
    PROJECT_DOCS_DIRS = [p for p in candidates if os.path.isdir(p)]

# Backward compatibility alias
PROJECT_SOURCE_DIRS = PROJECT_DOCS_DIRS

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 800))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 100))
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