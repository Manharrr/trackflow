import os
import shutil
import tempfile
from app.loader import load_documents

def test_loader():
    print("\n--- TEST 1: Load from /app/documents ---")
    docs = load_documents(["/app/documents"])
    print(f"Loaded {len(docs)} documents:")
    for d in docs:
        meta = d["metadata"]
        print(f"  [OK] {meta['file_type'].upper()}: {meta['file_name']} ({len(d['content'])} chars)")

    has_pdf = any(d["metadata"]["file_type"] == "pdf" for d in docs)
    has_md = any(d["metadata"]["file_type"] == "markdown" for d in docs)
    assert has_pdf, "Expected at least one PDF loaded!"
    assert has_md, "Expected at least one Markdown loaded!"
    print(">>> PASS: PDF and Markdown are successfully loaded!")

    print("\n--- TEST 2: Verify Python and Code files are IGNORED ---")
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create a mix of files
        with open(os.path.join(temp_dir, "doc1.md"), "w") as f:
            f.write("# Valid Markdown Documentation\nContent here.")
        with open(os.path.join(temp_dir, "app.py"), "w") as f:
            f.write("def ignored_python_code(): pass")
        with open(os.path.join(temp_dir, "script.js"), "w") as f:
            f.write("function ignoredJavaScript() {}")
        with open(os.path.join(temp_dir, "config.json"), "w") as f:
            f.write('{"ignored": true}')
        with open(os.path.join(temp_dir, ".env"), "w") as f:
            f.write("SECRET_KEY=12345")

        test_docs = load_documents([temp_dir])
        loaded_filenames = [d["metadata"]["file_name"] for d in test_docs]
        print(f"Loaded files from mixed directory: {loaded_filenames}")

        assert "doc1.md" in loaded_filenames, "doc1.md should be loaded"
        assert "app.py" not in loaded_filenames, "app.py MUST be ignored"
        assert "script.js" not in loaded_filenames, "script.js MUST be ignored"
        assert "config.json" not in loaded_filenames, "config.json MUST be ignored"
        assert ".env" not in loaded_filenames, ".env MUST be ignored"
        print(">>> PASS: All Python, JS, JSON, and .env files are strictly ignored!")

if __name__ == "__main__":
    test_loader()
