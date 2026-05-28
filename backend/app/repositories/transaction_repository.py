"""
Transaction repository — data-access layer for the transactions (ledger) table.
"""

import uuid
from datetime import datetime, timezone

from app.database.db import get_db


def create_transaction(
    sender_vpa: str,
    receiver_vpa: str,
    amount: int,
    status: str,
    ciphertext_hash: str,
) -> dict:
    """
    Insert a new transaction into the ledger and return it as a dict.
    """
    tx_id = str(uuid.uuid4())
    settled_at = datetime.now(timezone.utc).isoformat()

    conn = get_db()
    try:
        conn.execute(
            '''INSERT INTO transactions
               (tx_id, sender_vpa, receiver_vpa, amount, status, ciphertext_hash, settled_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (tx_id, sender_vpa, receiver_vpa, amount, status, ciphertext_hash, settled_at),
        )
        conn.commit()
        return {
            'tx_id': tx_id,
            'sender_vpa': sender_vpa,
            'receiver_vpa': receiver_vpa,
            'amount': amount,
            'status': status,
            'ciphertext_hash': ciphertext_hash,
            'settled_at': settled_at,
        }
    finally:
        conn.close()


def get_all_transactions() -> list[dict]:
    """Return the full ledger, newest first."""
    conn = get_db()
    try:
        rows = conn.execute(
            'SELECT * FROM transactions ORDER BY settled_at DESC'
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_by_hash(ciphertext_hash: str) -> dict | None:
    """Look up a transaction by its ciphertext hash."""
    conn = get_db()
    try:
        row = conn.execute(
            'SELECT * FROM transactions WHERE ciphertext_hash = ?',
            (ciphertext_hash,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
