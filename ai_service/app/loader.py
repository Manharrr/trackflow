import os
from pypdf import PdfReader

# ONLY Markdown (.md) and PDF (.pdf) documentation files are allowed
SUPPORTED_EXTENSIONS = {".md", ".pdf"}

# Source code, config, binary, and environment extensions that MUST be strictly ignored
IGNORED_CODE_EXTENSIONS = {
    ".py", ".pyc", ".js", ".jsx", ".ts", ".tsx", ".json", ".yml", ".yaml",
    ".env", ".log", ".sql", ".sh", ".dockerfile", ".tf", ".tfstate",
    ".html", ".css", ".scss", ".map", ".txt", ".xml", ".csv", ".toml"
}

EXCLUDED_DIR_NAMES = {
    "venv", "kenv", "lenv", "node_modules", ".git", "__pycache__",
    ".pytest_cache", ".mypy_cache", "dist", "build", "media", "static",
    "migrations", "terraform"
}

EXCLUDED_FILE_SUFFIXES = (".pyc", ".log", ".env")


def _is_excluded_dir(dirname: str) -> bool:
    return dirname in EXCLUDED_DIR_NAMES or dirname.startswith(".")


def _determine_visibility(rel_path: str, ext: str) -> str:
    """Project documentation is public by default for chatbot context."""
    return "public"


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

    if not content or not content.strip():
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

        if not text or not text.strip():
            return None

        null_ratio = text.count("\x00") / max(len(text), 1)
        if null_ratio > 0.05:
            print(f"  [Warning] Skipping garbled PDF: {path}")
            return None

        return text
    except Exception as e:
        print(f"  [Warning] Error reading PDF {path}: {e}")
        return None


def _guess_file_type(ext: str) -> str:
    return {
        ".md": "markdown",
        ".pdf": "pdf",
    }.get(ext, "unknown")


def load_documents(source_dirs: list[str]) -> list[dict]:
    """
    Recursively scan source_dirs for ONLY project documentation files (.md, .pdf).
    Source-code files (.py, .js, etc.) and non-documentation files are strictly ignored.
    """
    documents = []
    pdf_count = 0
    md_count = 0
    ignored_count = 0
    ignored_extensions = set()
    skipped_count = 0

    print("==================================================")
    print("[RAG Ingestion] Document Discovery Started")
    print("==================================================")

    for base_dir in source_dirs:
        if not os.path.isdir(base_dir):
            print(f"  [Warning] Skipping non-existent directory: {base_dir}")
            continue

        print(f"[RAG Ingestion] Scanning directory: {base_dir}")

        for root, dirs, files in os.walk(base_dir):
            # Filter out virtual environments, node_modules, git, and hidden directories
            dirs[:] = [d for d in dirs if not _is_excluded_dir(d)]

            for filename in files:
                if filename == ".env" or filename.startswith("."):
                    ignored_count += 1
                    continue

                ext = os.path.splitext(filename)[1].lower()

                # Strictly allow only Markdown and PDF documentation files
                if ext not in SUPPORTED_EXTENSIONS:
                    ignored_count += 1
                    if ext:
                        ignored_extensions.add(ext)
                    continue

                full_path = os.path.join(root, filename)

                if ext == ".pdf":
                    content = _read_pdf_file(full_path)
                elif ext == ".md":
                    content = _read_text_file(full_path)
                else:
                    content = None

                if not content or not content.strip():
                    skipped_count += 1
                    continue

                if ext == ".pdf":
                    pdf_count += 1
                elif ext == ".md":
                    md_count += 1

                rel_path = os.path.relpath(full_path, base_dir)
                rel_path_norm = rel_path.replace("\\", "/")
                module = rel_path_norm.split("/")[0] if "/" in rel_path_norm else "docs"

                documents.append({
                    "content": content,
                    "metadata": {
                        "source": rel_path_norm,
                        "file_name": filename,
                        "file_type": _guess_file_type(ext),
                        "module": module,
                        "tenant_id": None,
                        "visibility": "public",
                    },
                })

    print("--------------------------------------------------")
    print("[RAG Ingestion Summary]")
    print(f"  - Markdown (.md) files loaded: {md_count}")
    print(f"  - PDF (.pdf) files loaded:      {pdf_count}")
    print(f"  - Ignored non-doc/code files:   {ignored_count} (extensions: {', '.join(sorted(ignored_extensions)) if ignored_extensions else 'none'})")
    print(f"  - Skipped empty/corrupt files:  {skipped_count}")
    print(f"  - Total valid documents loaded: {len(documents)}")
    print("==================================================")

    return documents
