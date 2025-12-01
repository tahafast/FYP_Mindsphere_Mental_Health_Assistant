import os

def is_binary(file_path):
    """
    Check if a file is binary by reading a small chunk.
    """
    try:
        with open(file_path, 'rb') as f:
            chunk = f.read(1024)
            if b'\0' in chunk:
                return True
            # Check for high byte count which might indicate binary
            text_chars = bytearray({7, 8, 9, 10, 12, 13, 27} | set(range(0x20, 0x100)) - {0x7f})
            return bool(chunk.translate(None, text_chars))
    except Exception:
        return True

def dump_repo(output_file='full_codebase.txt'):
    """
    Walks the current directory and dumps all text files into a single output file.
    Respects a hardcoded list of ignored directories and file extensions.
    """
    # Directories to ignore
    IGNORE_DIRS = {
        '.git', 'node_modules', '__pycache__', 'venv', 'env', '.gemini', 
        'dist', 'build', '.next', 'coverage', '.vscode', '.idea', 'site-packages'
    }
    
    # File extensions to ignore (images, compiled files, etc.)
    IGNORE_EXTS = {
        '.pyc', '.pyo', '.pyd', '.so', '.dll', '.exe', '.bin', 
        '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
        '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
        '.db', '.sqlite', '.sqlite3', '.pkl', '.ds_store',
        '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4'
    }

    # Specific files to ignore
    IGNORE_FILES = {
        'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 
        output_file, 'repo_dumper.py'
    }

    cwd = os.getcwd()
    
    with open(output_file, 'w', encoding='utf-8') as out_f:
        for root, dirs, files in os.walk(cwd):
            # Modify dirs in-place to skip ignored directories
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file in IGNORE_FILES:
                    continue
                
                _, ext = os.path.splitext(file)
                if ext.lower() in IGNORE_EXTS:
                    continue
                
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, cwd)
                
                # Double check for binary content
                if is_binary(file_path):
                    print(f"Skipping binary file: {rel_path}")
                    continue
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as in_f:
                        content = in_f.read()
                        
                    out_f.write(f"\n{'='*80}\n")
                    out_f.write(f"FILE: {rel_path}\n")
                    out_f.write(f"{'='*80}\n\n")
                    out_f.write(content)
                    out_f.write("\n")
                    
                    print(f"Added: {rel_path}")
                    
                except Exception as e:
                    print(f"Error reading {rel_path}: {e}")

    print(f"\nRepository dump completed. Output saved to: {output_file}")

if __name__ == "__main__":
    dump_repo()
