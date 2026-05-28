"""
Server RSA key holder — generates an ephemeral RSA-2048 key pair on startup.

The key pair lives in memory only. Every server restart produces new keys.
This is intentional for a demo: no key-file management, no HSM, no secrets
on disk. In production you'd load from a vault or HSM.
"""

from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

# Module-level singleton — generated once at import time
_private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)
_public_key = _private_key.public_key()


def get_private_key():
    """Return the server's RSA private key (for decryption)."""
    return _private_key


def get_public_key():
    """Return the server's RSA public key (for encryption)."""
    return _public_key


def get_public_key_pem() -> bytes:
    """Return the public key as PEM bytes (useful for API responses)."""
    return _public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
