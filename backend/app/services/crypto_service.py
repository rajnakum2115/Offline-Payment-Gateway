"""
Crypto service — high-level encrypt/decrypt for PaymentInstructions.

Wraps hybrid_crypto + server_key_holder so the rest of the app never
touches raw crypto primitives.
"""

import base64

from app.crypto import hybrid_crypto, server_key_holder
from app.models.payment_instruction import PaymentInstruction


def encrypt_payment(payment: PaymentInstruction) -> str:
    """
    Encrypt a PaymentInstruction and return the ciphertext as a
    base64-encoded string (ready to be stuffed into a MeshPacket).
    """
    plaintext = payment.to_bytes()
    ciphertext = hybrid_crypto.encrypt(plaintext, server_key_holder.get_public_key())
    return base64.b64encode(ciphertext).decode('ascii')


def decrypt_payment(ciphertext_b64: str) -> PaymentInstruction:
    """
    Decrypt a base64-encoded ciphertext blob back into a
    PaymentInstruction.  Raises on tamper or wrong key.
    """
    ciphertext = base64.b64decode(ciphertext_b64)
    plaintext = hybrid_crypto.decrypt(ciphertext, server_key_holder.get_private_key())
    return PaymentInstruction.from_bytes(plaintext)
