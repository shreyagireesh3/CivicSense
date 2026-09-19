"""
Root conftest.py — ensures the project root is on sys.path so that
'from backend.main import app' resolves correctly from any working directory.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
