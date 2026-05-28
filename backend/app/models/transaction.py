"""
Transaction model — represents a settled payment in the ledger.

Each row records: who paid whom, how much, the ciphertext hash that
proved idempotency, and when it was settled.
"""

# Status constants
STATUS_SETTLED = 'SETTLED'
STATUS_DUPLICATE = 'DUPLICATE'
STATUS_REJECTED = 'REJECTED'
STATUS_FAILED = 'FAILED'
