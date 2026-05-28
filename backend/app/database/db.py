"""
SQLite database management — init, schema creation, seed data, connection helper.

Uses WAL mode for better concurrency and stores the DB file at the path
specified in Config.DATABASE_PATH.
"""

import sqlite3
import os

from app.config.config import Config
from app.models.account import SEED_ACCOUNTS

_db_path = Config.DATABASE_PATH


def get_db() -> sqlite3.Connection:
    """
    Return a new SQLite connection with WAL mode and row_factory set
    so rows behave like dicts.
    """
    conn = sqlite3.connect(_db_path)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA foreign_keys=ON')
    return conn


def init_db():
    """
    Create tables if they don't exist and seed the accounts table
    if it's empty.  Safe to call on every startup.
    """
    os.makedirs(os.path.dirname(_db_path) or '.', exist_ok=True)

    conn = get_db()
    try:
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS accounts (
                vpa      TEXT PRIMARY KEY,
                name     TEXT    NOT NULL,
                balance  INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS transactions (
                tx_id           TEXT PRIMARY KEY,
                sender_vpa      TEXT    NOT NULL,
                receiver_vpa    TEXT    NOT NULL,
                amount          INTEGER NOT NULL,
                status          TEXT    NOT NULL,
                ciphertext_hash TEXT    NOT NULL,
                settled_at      TEXT    NOT NULL,
                FOREIGN KEY (sender_vpa)   REFERENCES accounts(vpa),
                FOREIGN KEY (receiver_vpa) REFERENCES accounts(vpa)
            );
        ''')

        # Seed accounts only if the table is empty
        row = conn.execute('SELECT COUNT(*) AS cnt FROM accounts').fetchone()
        if row['cnt'] == 0:
            conn.executemany(
                'INSERT INTO accounts (vpa, name, balance) VALUES (?, ?, ?)',
                [(a['vpa'], a['name'], a['balance']) for a in SEED_ACCOUNTS],
            )
            conn.commit()
    finally:
        conn.close()


def reset_db():
    """Drop and re-create everything.  Used by tests and the reset endpoint."""
    conn = get_db()
    try:
        conn.executescript('''
            DELETE FROM transactions;
            DELETE FROM accounts;
        ''')
        conn.executemany(
            'INSERT INTO accounts (vpa, name, balance) VALUES (?, ?, ?)',
            [(a['vpa'], a['name'], a['balance']) for a in SEED_ACCOUNTS],
        )
        conn.commit()
    finally:
        conn.close()
