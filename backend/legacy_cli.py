import os
import importlib.util
import sys
from pathlib import Path

from dotenv import load_dotenv

app_path = Path(__file__).with_name("app.py")
project_root = app_path.parent.parent
load_dotenv(project_root / ".env")
database_url = os.environ.get("DATABASE_URL", "sqlite:///glamride.db")
if database_url.startswith("sqlite:///"):
    database_path = Path(database_url.removeprefix("sqlite:///"))
    if not database_path.is_absolute():
        database_path = (project_root / "instance" / database_path).resolve()
        os.environ["DATABASE_URL"] = f"sqlite:///{database_path.as_posix()}"

spec = importlib.util.spec_from_file_location("glamride_legacy_app", app_path)
if spec is None or spec.loader is None:
    raise ImportError(f"Could not load the legacy Flask app from {app_path}.")

legacy_app = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = legacy_app
spec.loader.exec_module(legacy_app)

app = legacy_app.app
