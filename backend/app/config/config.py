"""
Application configuration — loads values from .env and exposes them
through a Config class that Flask can consume.
"""

import os
from dotenv import load_dotenv

# Load .env from the backend root (two levels up from this file)
_basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
load_dotenv(os.path.join(_basedir, '.env'))


class Config:
    """Central configuration object consumed by create_app()."""

    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'fallback-dev-key')
    DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() in ('true', '1', 'yes')

    # SQLite database path — relative to the backend/ directory
    DATABASE_PATH = os.path.join(_basedir, 'mesh.db')

    # How many hours a payment's signedAt timestamp may be in the past
    FRESHNESS_WINDOW_HOURS = int(os.getenv('FRESHNESS_WINDOW_HOURS', '24'))
