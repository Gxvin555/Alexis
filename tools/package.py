"""Build the distributable Alexis folder and zip.

Usage:
    python3 tools/package.py [output_dir]

Alexis ships as alexis.html plus an assets folder (images). Fonts are embedded in
the HTML, so no font files are needed at run time. This tool copies exactly the
files the app uses into <output_dir>/alexis/, checks every asset against
assets/ASSET_MANIFEST.json, and writes <output_dir>/alexis.zip. It never edits
the source files. The default output_dir is dist/ (ignored by git).
"""
import hashlib
import json
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = [
    'alexis.html',
    'amethyst-money.html',
    'README.md',
    'assets/ASSET_MANIFEST.json',
    'assets/fonts/Poppins-OFL.txt',
]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main(out_dir):
    out_dir = Path(out_dir).resolve()
    target = out_dir / 'alexis'
    if target.exists():
        shutil.rmtree(target)
    manifest = json.loads((ROOT / 'assets/ASSET_MANIFEST.json').read_text(encoding='utf-8'))
    files = list(FILES) + [a['file'] for a in manifest['assets']]
    for rel in files:
        src = ROOT / rel
        if not src.is_file():
            raise SystemExit(f'Missing file: {rel}')
        dest = target / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dest)
    for asset in manifest['assets']:
        got = sha256(target / asset['file'])
        if got != asset['sha256']:
            raise SystemExit(f"Hash mismatch for {asset['file']}: {got}")
        if 'canonical_sha256' in asset and got != asset['canonical_sha256']:
            raise SystemExit(f"{asset['file']} does not match its canonical original")
    html = (target / 'alexis.html').read_text(encoding='utf-8')
    for asset in manifest['assets']:
        name = asset['file']
        if name not in html and 'favicon' not in name:
            print(f'Note: {name} is packaged but not referenced by alexis.html')
    zip_path = out_dir / 'alexis.zip'
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for rel in sorted(files):
            zf.write(target / rel, f'alexis/{rel}')
    print(f'Packaged {len(files)} files into {target} and {zip_path}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'dist')
