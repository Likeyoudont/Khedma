#!/usr/bin/env python3
"""Prepare a source/build release without credentials, live data or dependencies."""
from pathlib import Path
import argparse
import hashlib
import io
from html.parser import HTMLParser
import tarfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=root / 'release')
args = parser.parse_args()
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)
frontend = root / 'dist'
if not (frontend / 'index.html').is_file():
    raise SystemExit('Build the frontend first: npm run build')
class BuildModeParser(HTMLParser):
    mode = None

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == 'meta' and values.get('name') == 'khedma-build-mode':
            self.mode = values.get('content')

marker = BuildModeParser()
marker.feed((frontend / 'index.html').read_text())
if marker.mode != 'public':
    raise SystemExit('Public release requires a public frontend build. Run: VITE_STATIC_PREVIEW=false VITE_ENABLE_DEMO=false npm run build')
archive = output / 'khedma-release.tar.gz'
temporary = output / 'khedma-release.tar.gz.tmp'
backend = root / 'backend'
with tarfile.open(temporary, 'w:gz') as bundle:
    def add_tree(source, target):
        for file in sorted(source.rglob('*')):
            if file.is_symlink() or not file.is_file():
                continue
            if any(part in {'.git', 'node_modules', 'vendor', 'storage', 'cache'} for part in file.relative_to(source).parts):
                continue
            if file.name.startswith('.env') or file.suffix in {'.sqlite', '.log', '.pem', '.key'}:
                continue
            bundle.add(file, arcname=str(Path(target) / file.relative_to(source)), recursive=False)
    add_tree(frontend, 'frontend')
    for directory in ['app', 'config', 'routes', 'database/migrations', 'database/seeders', 'resources', 'public']:
        add_tree(backend / directory, Path('backend') / directory)
    for name in ['artisan', 'composer.json', 'composer.lock', '.env.example', 'bootstrap/app.php', 'bootstrap/providers.php']:
        bundle.add(backend / name, arcname='backend/' + name, recursive=False)
    for directory in ['backend/bootstrap/cache', 'backend/storage/app/private', 'backend/storage/app/public', 'backend/storage/framework/cache/data', 'backend/storage/framework/sessions', 'backend/storage/framework/views', 'backend/storage/logs']:
        item = tarfile.TarInfo(directory)
        item.type = tarfile.DIRTYPE
        item.mode = 0o775
        bundle.addfile(item)
    add_tree(root / 'deployment', 'deployment')
    bundle.add(root / 'LAUNCH-READINESS.md', arcname='LAUNCH-READINESS.md', recursive=False)
    bundle.add(root / 'PUBLIC-LAUNCH-CHECK.md', arcname='PUBLIC-LAUNCH-CHECK.md', recursive=False)
    bundle.add(root / 'PAYMENTS.md', arcname='PAYMENTS.md', recursive=False)
    bundle.add(root / 'EXPERIENCE-AUDIT.md', arcname='EXPERIENCE-AUDIT.md', recursive=False)
    bundle.add(root / 'DOMAIN-NAMES.md', arcname='DOMAIN-NAMES.md', recursive=False)
    bundle.add(root / 'MOROCCO-MOBILE-RESEARCH.md', arcname='MOROCCO-MOBILE-RESEARCH.md', recursive=False)
    text = b'Install instructions: LAUNCH-READINESS.md\nFrontend build is included. Run composer install --no-dev --optimize-autoloader in backend.\nNo database, .env, application key, installed dependencies or user uploads are included.\n'
    item = tarfile.TarInfo('README.txt')
    item.size = len(text)
    item.mode = 0o644
    bundle.addfile(item, io.BytesIO(text))
temporary.replace(archive)
with archive.open('rb') as file:
    digest = hashlib.file_digest(file, 'sha256').hexdigest()
(output / 'SHA256SUMS').write_text(f'{digest}  {archive.name}\n')
print(f'Release: {archive}')
print(f'Checksum: {output / "SHA256SUMS"}')
