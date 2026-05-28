"""
MeshPacket — the envelope that travels device-to-device through the mesh.

Contains opaque ciphertext (base64-encoded) plus routing metadata:
  - packet_id: globally unique identifier
  - ttl:       decremented each hop; packet is dropped at 0
  - hops:      ordered list of device names that relayed the packet
"""

import uuid
import base64
from dataclasses import dataclass, field
from typing import List


@dataclass
class MeshPacket:
    ciphertext_b64: str                               # base64-encoded encrypted blob
    packet_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    ttl: int = 5
    hops: List[str] = field(default_factory=list)

    # ── Helpers ────────────────────────────────────────────────────

    @property
    def ciphertext_bytes(self) -> bytes:
        """Decode the base64 ciphertext back to raw bytes."""
        return base64.b64decode(self.ciphertext_b64)

    def to_dict(self) -> dict:
        return {
            'packet_id': self.packet_id,
            'ciphertext_b64': self.ciphertext_b64,
            'ttl': self.ttl,
            'hops': list(self.hops),
        }

    @classmethod
    def from_dict(cls, d: dict) -> 'MeshPacket':
        return cls(
            packet_id=d['packet_id'],
            ciphertext_b64=d['ciphertext_b64'],
            ttl=d['ttl'],
            hops=list(d.get('hops', [])),
        )

    def clone(self) -> 'MeshPacket':
        """Deep-copy so each device holds its own instance."""
        return MeshPacket(
            packet_id=self.packet_id,
            ciphertext_b64=self.ciphertext_b64,
            ttl=self.ttl,
            hops=list(self.hops),
        )
