import os

FILES = [
    "backend/src/models/ApplicationSettings.ts",
    "backend/src/routes/settings.ts",
    "backend/src/routes/laneRates.ts",
    "backend/src/routes/accessorialTypes.ts"
]

def main():
    output_file = "source_extract.md"
    with open(output_file, "w", encoding="utf-8") as out:
        out.write("# Combined Source Code\n\n")
        for file_path in FILES:
            if not os.path.isfile(file_path):
                print(f"[!] Skipping missing file: {file_path}")
                continue
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    code = f.read()
                ext = os.path.splitext(file_path)[1][1:]  # Get file extension without dot
                out.write(f"## `{file_path}`\n")
                out.write(f"```{ext}\n{code}\n```\n\n")
            except Exception as e:
                out.write(f"## `{file_path}`\n")
                out.write(f"Error reading file: {e}\n\n")
    print(f"\n✅ Markdown file created: {output_file}")

if __name__ == "__main__":
    main()