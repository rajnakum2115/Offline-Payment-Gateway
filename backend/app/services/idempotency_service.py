"""
Idempotency service — ensures each payment settles exactly once.

Uses an in-memory set of SHA-256 hashes of the raw ciphertext.
A threading lock provides atomic compare-and-set so that even if
two bridge nodes POST the same packet concurrently, only one wins.
"""

import hashlib
import threading

_seen_hashes: set[str] = set()
_lock = threading.Lock()


def try_claim(ciphertext_bytes: bytes) -> tuple[bool, str]:
    """
    Hash the ciphertext and try to claim it.

    Returns (claimed, hash_hex):
      - claimed=True  → this is the first time we've seen this packet
      - claimed=False → duplicate; someone already claimed it
    """
    h = hashlib.sha256(ciphertext_bytes).hexdigest()
    with _lock:
        if h in _seen_hashes:
            return False, h
        _seen_hashes.add(h)
        return True, h


def is_known(ciphertext_hash: str) -> bool:
    """Check whether a hash has already been claimed."""
    with _lock:
        return ciphertext_hash in _seen_hashes


def reset():
    """Clear the idempotency cache (used when resetting the demo)."""
    with _lock:
        _seen_hashes.clear()
