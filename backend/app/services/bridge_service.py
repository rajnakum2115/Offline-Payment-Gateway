"""
Bridge service — the full ingestion pipeline.

When a bridge device (the phone that walked outside and got 4G) uploads
a packet, this service runs the complete processing chain:

  1. SHA-256 hash the ciphertext
  2. Idempotency check (try_claim)
  3. Decrypt with server RSA private key
  4. Verify freshness (signedAt within 24 hours)
  5. Settle (debit sender, credit receiver)
"""

import base64
from datetime import datetime, timezone, timedelta

from app.config.config import Config
from app.models.transaction import STATUS_DUPLICATE, STATUS_REJECTED
from app.services import crypto_service, idempotency_service, settlement_service


def ingest_packet(ciphertext_b64: str) -> dict:
    """
    Process a single base64-encoded ciphertext blob through the full
    settlement pipeline.

    Returns a result dict with 'status' and details.
    """
    ciphertext_bytes = base64.b64decode(ciphertext_b64)

    # ── Step 1 & 2: Hash + idempotency ──────────────────────────
    claimed, ct_hash = idempotency_service.try_claim(ciphertext_bytes)
    if not claimed:
        return {
            'status': STATUS_DUPLICATE,
            'ciphertext_hash': ct_hash,
            'message': 'Duplicate packet — already settled.',
        }

    # ── Step 3: Decrypt ──────────────────────────────────────────
    try:
        payment = crypto_service.decrypt_payment(ciphertext_b64)
    except Exception as e:
        return {
            'status': STATUS_REJECTED,
            'ciphertext_hash': ct_hash,
            'message': f'Decryption failed (tampered?): {e}',
        }

    # ── Step 4: Freshness check ──────────────────────────────────
    try:
        signed_at = datetime.fromisoformat(payment.signed_at)
        # Make sure it's timezone-aware
        if signed_at.tzinfo is None:
            signed_at = signed_at.replace(tzinfo=timezone.utc)
        age = datetime.now(timezone.utc) - signed_at
        max_age = timedelta(hours=Config.FRESHNESS_WINDOW_HOURS)
        if age > max_age:
            return {
                'status': STATUS_REJECTED,
                'ciphertext_hash': ct_hash,
                'message': f'Payment too old ({age} > {max_age}).',
            }
    except Exception as e:
        return {
            'status': STATUS_REJECTED,
            'ciphertext_hash': ct_hash,
            'message': f'Invalid signedAt timestamp: {e}',
        }

    # ── Step 5: Settle ───────────────────────────────────────────
    result = settlement_service.settle(payment, ct_hash)
    result['ciphertext_hash'] = ct_hash
    result['payment'] = {
        'sender': payment.sender_vpa,
        'receiver': payment.receiver_vpa,
        'amount': payment.amount,
        'nonce': payment.nonce,
    }
    return result
