"""Create a disposable backend; never read the owner's .env or database."""
from pathlib import Path
import shutil
import tempfile
import subprocess
root = Path(__file__).resolve().parents[2]
vendor = root / 'backend/vendor'
if not vendor.exists():
    vendor = root.parent / 'khedma backend/vendor'
if not vendor.exists():
    raise SystemExit('Install backend Composer dependencies first.')
destination = Path(tempfile.mkdtemp(prefix='khedma-load-'))
app = destination / 'app'
shutil.copytree(root / 'backend', app, ignore=shutil.ignore_patterns('.env', 'vendor', 'node_modules', 'database.sqlite*', 'logs', 'sessions', 'cache'))
(app / 'vendor').symlink_to(vendor, target_is_directory=True)
for name in ['storage/framework/cache/data', 'storage/framework/sessions', 'storage/framework/views', 'storage/logs', 'bootstrap/cache']:
    (app / name).mkdir(parents=True, exist_ok=True)
(app / 'database/database.sqlite').touch()
(app / '.env').write_text(f'''APP_NAME=KhedmaLoad
APP_ENV=local
APP_DEBUG=false
APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
APP_URL=http://127.0.0.1:8099
DB_CONNECTION=sqlite
DB_DATABASE={app}/database/database.sqlite
CACHE_STORE=database
SESSION_DRIVER=file
SESSION_SECURE_COOKIE=false
LOG_CHANNEL=single
MAIL_MAILER=array
BCRYPT_ROUNDS=10
''')
for source in (Path(__file__).parent / 'load-harness').glob('*.php'):
    shutil.copy2(source, destination / source.name)
subprocess.run(['php', str(destination / 'init.php')], cwd=app, check=True)
print(destination)
