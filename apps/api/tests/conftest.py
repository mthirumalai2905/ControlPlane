from pathlib import Path

# Ensure hermes_api is importable when running pytest from apps/api
ROOT = Path(__file__).resolve().parents[1]
import sys

sys.path.insert(0, str(ROOT))
