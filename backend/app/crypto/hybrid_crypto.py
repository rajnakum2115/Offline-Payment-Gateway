"""
Hybrid encryption: RSA-OAEP + AES-256-GCM.

The sender's phone encrypts the payment like this:
  1. Generate a random 256-bit AES key and a 12-byte nonce.
  2. AES-GCM encrypt the plaintext → (ciphertext, tag).
  3. RSA-OAEP encrypt the AES key with the server's public key.
  4. Concatenate:  encrypted_aes_key (256 bytes) ‖ nonce (12) ‖ tag (16) ‖ aes_ciphertext

The backend decrypts in reverse. No intermediary can read or tamper
because they lack the server's RSA private key.
"""

import os

from cryptography.hazmat.primitives.asymmetric import padding as asym_padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# RSA-OAEP with SHA-256 produces a 256-byte output for a 2048-bit key
_RSA_CIPHERTEXT_LEN = 256
_AES_KEY_LEN = 32          # 256 bits
_NONCE_LEN = 12            # 96 bits — standard for GCM
_TAG_LEN = 16              # 128 bits — GCM tag


def encrypt(plaintext: bytes, rsa_public_key) -> bytes:
    """
    Hybrid-encrypt *plaintext* under the given RSA public key.

    Returns an opaque blob that can only be decrypted with the
    matching RSA private key.
    """
    # 1. Random AES-256 key + nonce
    aes_key = os.urandom(_AES_KEY_LEN)
    nonce = os.urandom(_NONCE_LEN)

    # 2. AES-GCM encrypt  (the library appends the 16-byte tag to ciphertext)
    aesgcm = AESGCM(aes_key)
    ct_with_tag = aesgcm.encrypt(nonce, plaintext, None)  # no AAD
    # Split: last 16 bytes are the tag
    aes_ciphertext = ct_with_tag[:-_TAG_LEN]
    tag = ct_with_tag[-_TAG_LEN:]

    # 3. RSA-OAEP encrypt the AES key
    encrypted_aes_key = rsa_public_key.encrypt(
        aes_key,
        asym_padding.OAEP(
            mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )

    # 4. Pack into a single blob
    return encrypted_aes_key + nonce + tag + aes_ciphertext


def decrypt(blob: bytes, rsa_private_key) -> bytes:
    """
    Reverse of encrypt(). Raises on tamper or wrong key.
    """
    # Unpack
    encrypted_aes_key = blob[:_RSA_CIPHERTEXT_LEN]
    nonce = blob[_RSA_CIPHERTEXT_LEN:_RSA_CIPHERTEXT_LEN + _NONCE_LEN]
    tag = blob[_RSA_CIPHERTEXT_LEN + _NONCE_LEN:_RSA_CIPHERTEXT_LEN + _NONCE_LEN + _TAG_LEN]
    aes_ciphertext = blob[_RSA_CIPHERTEXT_LEN + _NONCE_LEN + _TAG_LEN:]

    # 1. RSA-OAEP decrypt the AES key
    aes_key = rsa_private_key.decrypt(
        encrypted_aes_key,
        asym_padding.OAEP(
            mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )

    # 2. AES-GCM decrypt (library expects ciphertext+tag concatenated)
    aesgcm = AESGCM(aes_key)
    plaintext = aesgcm.decrypt(nonce, aes_ciphertext + tag, None)

    return plaintext
