import os

EXCLUDED_DIRS = {'node_modules', '.venv', 'venv', '__pycache__', '.git'}
INCLUDED_EXTS = {'.ts', '.js', '.json', '.tsx', '.py'}  # extend as needed

def collect_files(folder_path):
    collected = []
    for root, dirs, files in os.walk(folder_path):
        # Modify dirs in-place to skip excluded ones
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
        for file in files:
            ext = os.path.splitext(file)[1]
            if ext in INCLUDED_EXTS:
                collected.append(os.path.join(root, file))
    return collected

def generate_markdown(file_list, output_path="source_extract.md"):
    with open(output_path, "w", encoding="utf-8") as out:
        out.write("# Combined Source Code\n\n")
        for path in file_list:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    code = f.read()
                rel_path = os.path.relpath(path)
                ext = os.path.splitext(path)[1][1:]
                out.write(f"## `{rel_path}`\n")
                out.write(f"```{ext}\n{code}\n```\n\n")
            except Exception as e:
                out.write(f"## `{rel_path}`\nError reading file: {e}\n\n")
    print(f"\n✅ Markdown file created at: {output_path}")

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Extract source files from a folder into a markdown file")
    parser.add_argument("folder", help="Folder path to scan")
    args = parser.parse_args()

    if not os.path.isdir(args.folder):
        print("❌ Invalid folder path")
        return

    files = collect_files(args.folder)
    if not files:
        print("⚠️ No matching files found.")
        return

    generate_markdown(files)

if __name__ == "__main__":
    main()
