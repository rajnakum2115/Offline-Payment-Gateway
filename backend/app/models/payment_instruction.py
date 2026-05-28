"""
PaymentInstruction — the plaintext that lives *inside* the encrypted blob.

Created by the sender's phone, encrypted, stuffed into a MeshPacket,
and only decrypted by the backend after a bridge node uploads it.
"""

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class PaymentInstruction:
    sender_vpa: str                   # e.g. "alice@upi"
    receiver_vpa: str                 # e.g. "bob@upi"
    amount: int                       # in paise (₹500 = 50000)
    pin_hash: str                     # SHA-256 of the user's UPI PIN
    nonce: str = field(default_factory=lambda: str(uuid.uuid4()))
    signed_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    # ── Serialisation ──────────────────────────────────────────────

    def to_json(self) -> str:
        return json.dumps({
            'sender_vpa': self.sender_vpa,
            'receiver_vpa': self.receiver_vpa,
            'amount': self.amount,
            'pin_hash': self.pin_hash,
            'nonce': self.nonce,
            'signed_at': self.signed_at,
        })

    def to_bytes(self) -> bytes:
        return self.to_json().encode('utf-8')

    @classmethod
    def from_json(cls, raw: str) -> 'PaymentInstruction':
        d = json.loads(raw)
        return cls(**d)

    @classmethod
    def from_bytes(cls, data: bytes) -> 'PaymentInstruction':
        return cls.from_json(data.decode('utf-8'))
