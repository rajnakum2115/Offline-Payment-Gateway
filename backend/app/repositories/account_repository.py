"""
Account repository — thin data-access layer over the accounts table.
"""

from app.database.db import get_db


def get_all_accounts() -> list[dict]:
    """Return every account as a plain dict."""
    conn = get_db()
    try:
        rows = conn.execute('SELECT vpa, name, balance FROM accounts ORDER BY name').fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_account(vpa: str) -> dict | None:
    """Return a single account or None."""
    conn = get_db()
    try:
        row = conn.execute('SELECT vpa, name, balance FROM accounts WHERE vpa = ?', (vpa,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_balance(vpa: str, delta: int) -> bool:
    """
    Atomically adjust *vpa*'s balance by *delta* (can be negative).
    Returns False if the account doesn't exist or if the resulting
    balance would go negative.
    """
    conn = get_db()
    try:
        # Check current balance first
        row = conn.execute('SELECT balance FROM accounts WHERE vpa = ?', (vpa,)).fetchone()
        if row is None:
            return False
        new_balance = row['balance'] + delta
        if new_balance < 0:
            return False
        conn.execute('UPDATE accounts SET balance = ? WHERE vpa = ?', (new_balance, vpa))
        conn.commit()
        return True
    finally:
        conn.close()


def transfer(sender_vpa: str, receiver_vpa: str, amount: int) -> bool:
    """
    Atomically debit sender and credit receiver in a single transaction.
    Returns False if sender has insufficient funds or either account
    doesn't exist.
    """
    conn = get_db()
    try:
        sender = conn.execute('SELECT balance FROM accounts WHERE vpa = ?', (sender_vpa,)).fetchone()
        receiver = conn.execute('SELECT balance FROM accounts WHERE vpa = ?', (receiver_vpa,)).fetchone()

        if sender is None or receiver is None:
            return False
        if sender['balance'] < amount:
            return False

        conn.execute('UPDATE accounts SET balance = balance - ? WHERE vpa = ?', (amount, sender_vpa))
        conn.execute('UPDATE accounts SET balance = balance + ? WHERE vpa = ?', (amount, receiver_vpa))
        conn.commit()
        return True
    finally:
        conn.close()
