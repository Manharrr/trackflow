import os
from pypdf import PdfReader

SUPPORTED_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".md", ".txt", ".json", ".pdf"}

EXCLUDED_DIR_NAMES = {
    "venv", "kenv", "lenv", "node_modules", ".git", "__pycache__",
    ".pytest_cache", ".mypy_cache", "dist", "build", "media", "static",
}

EXCLUDED_FILE_SUFFIXES = (".pyc", ".log")

# Extensions that are safe to surface to PUBLIC/business chatbot users.
# Everything else (code, config, json, pdf-by-default) is INTERNAL only.
PUBLIC_EXTENSIONS = {".md", ".txt"}

# Any folder name in this set forces INTERNAL regardless of extension
# (e.g. don't let a README inside a migrations folder leak schema notes).
FORCE_INTERNAL_DIR_NAMES = {"migrations", "config", "secrets", "internal"}

# Any folder name in this set forces PUBLIC regardless of extension
# (e.g. a docs/public folder full of onboarding guides, even if it had .json samples).
FORCE_PUBLIC_DIR_NAMES = {"docs", "public_docs", "help"}


def _is_excluded_dir(dirname: str) -> bool:
    return dirname in EXCLUDED_DIR_NAMES or dirname.startswith(".")


def _determine_visibility(rel_path: str, ext: str) -> str:
    """
    Decide whether a chunk from this file is safe to retrieve for the
    PUBLIC/business chatbot, or should only ever be retrieved for the
    INTERNAL/project-knowledge chatbot.

    This runs at indexing time, not at answer time, so filtering happens
    before the content ever reaches the LLM prompt.
    """
    parts = {p.lower() for p in rel_path.replace("\\", "/").split("/")}

    if parts & FORCE_INTERNAL_DIR_NAMES:
        return "internal"

    if parts & FORCE_PUBLIC_DIR_NAMES:
        return "public"

    return "public" if ext in PUBLIC_EXTENSIONS else "internal"


def _read_text_file(path: str) -> str | None:
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except UnicodeDecodeError:
        try:
            with open(path, "r", encoding="latin-1") as f:
                content = f.read()
        except Exception:
            return None
    except Exception:
        return None

    if not content:
        return None

    # Reject garbled content (null-byte interleaved text)
    null_ratio = content.count("\x00") / max(len(content), 1)
    if null_ratio > 0.01:
        return None

    return content


def _read_pdf_file(path: str) -> str | None:
    try:
        reader = PdfReader(path)
        text = "\n".join(page.extract_text() or "" for page in reader.pages)

        if not text.strip():
            return None

        # Reject garbled extraction (e.g. null-byte interleaved text)
        null_ratio = text.count("\x00") / max(len(text), 1)
        if null_ratio > 0.05:
            print(f"  Skipping garbled PDF: {path}")
            return None

        return text
    except Exception:
        return None


def _guess_file_type(ext: str) -> str:
    return {
        ".py": "python", ".js": "javascript", ".jsx": "javascript",
        ".ts": "typescript", ".tsx": "typescript", ".md": "markdown",
        ".txt": "text", ".json": "json", ".pdf": "pdf",
    }.get(ext, "unknown")


def load_documents(source_dirs: list[str]) -> list[dict]:
    """Recursively scan source_dirs and return a list of documents with metadata."""
    documents = []
    found_count = 0
    skipped_count = 0
    public_count = 0

    for base_dir in source_dirs:
        if not os.path.isdir(base_dir):
            print(f"  Skipping missing directory: {base_dir}")
            continue

        for root, dirs, files in os.walk(base_dir):
            dirs[:] = [d for d in dirs if not _is_excluded_dir(d)]

            for filename in files:
                if filename == ".env" or filename.endswith(EXCLUDED_FILE_SUFFIXES):
                    continue

                ext = os.path.splitext(filename)[1].lower()
                if ext not in SUPPORTED_EXTENSIONS:
                    continue

                found_count += 1
                full_path = os.path.join(root, filename)

                content = (
                    _read_pdf_file(full_path) if ext == ".pdf" else _read_text_file(full_path)
                )

                if not content or not content.strip():
                    skipped_count += 1
                    continue

                rel_path = os.path.relpath(full_path, base_dir)
                rel_path_norm = rel_path.replace("\\", "/")
                module = rel_path_norm.split("/")[0] if "/" in rel_path_norm else "root"
                visibility = _determine_visibility(rel_path_norm, ext)

                if visibility == "public":
                    public_count += 1

                documents.append({
                    "content": content,
                    "metadata": {
                        "source": rel_path_norm,
                        "file_type": _guess_file_type(ext),
                        "module": module,
                        "tenant_id": None,
                        "visibility": visibility,
                    },
                })

    print(f"Found {found_count} files")
    print(f"Loaded {len(documents)} files ({public_count} marked public)")
    print(f"Skipped {skipped_count} files")
    return documents
