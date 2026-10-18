#!/usr/bin/env python3
"""Create a consistent SQLite snapshot and source/uploads archive on a mounted drive."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sqlite3
import tarfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--destination', type=Path, default=Path('/run/media/issam-abdelhak/WORK'))
args = parser.parse_args()
drive = args.destination.resolve()
if not drive.is_mount():
    parser.error('Destination must be a mounted drive; connect WORK first.')
source = ROOT / 'backend/database/database.sqlite'
if not source.is_file():
    parser.error('Local SQLite database does not exist.')
stamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H-%M-%S-%fZ')
target = drive / 'Khedma-backups' / stamp
target.mkdir(parents=True, exist_ok=False)
(target / 'INCOMPLETE').write_text('Backup still in progress.\n')
with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as live:
    with sqlite3.connect(target / 'database.sqlite') as backup:
        live.backup(backup)
        if backup.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise RuntimeError('Database backup failed integrity check.')
        tables = [row[0] for row in backup.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
excluded = {'.git', '.agents', '.codex', '.aws', 'node_modules', 'vendor', 'dist', 'logs', 'framework', '__pycache__'}
def safe_member(member):
    parts = Path(member.name).parts
    name = Path(member.name).name
    if any(part in excluded for part in parts) or member.issym() or member.islnk():
        return None
    if name.startswith('.env') and name != '.env.example':
        return None
    if name.startswith('database.sqlite') or name.endswith(('.pem', '.key')):
        return None
    return member
with tarfile.open(target / 'project-and-uploads.tar.gz', 'w:gz') as archive:
    for folder in ['src', 'public', 'backend', 'scripts', 'deployment']:
        archive.add(ROOT / folder, arcname=folder, filter=safe_member)
(target / 'manifest.json').write_text(json.dumps({'created_at_utc': stamp, 'database_tables': tables, 'secrets_included': False}, indent=2))
(target / 'INCOMPLETE').unlink()
print(f'Backup completed and SQLite integrity checked: {target}')
