"""
Unit tests for individual services: crypto, mesh, idempotency.
"""

import sys
import os
import base64
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


class TestHybridCrypto:
    """Test the RSA + AES-GCM hybrid encryption layer."""

    def test_encrypt_decrypt_roundtrip(self):
        from app.crypto import hybrid_crypto, server_key_holder

        plaintext = b'Hello, this is a secret UPI payment!'
        pub = server_key_holder.get_public_key()
        priv = server_key_holder.get_private_key()

        ciphertext = hybrid_crypto.encrypt(plaintext, pub)
        assert ciphertext != plaintext
        assert len(ciphertext) > len(plaintext)

        decrypted = hybrid_crypto.decrypt(ciphertext, priv)
        assert decrypted == plaintext

    def test_tampered_ciphertext_fails(self):
        from app.crypto import hybrid_crypto, server_key_holder

        plaintext = b'Tamper test payload'
        pub = server_key_holder.get_public_key()
        priv = server_key_holder.get_private_key()

        ciphertext = hybrid_crypto.encrypt(plaintext, pub)

        # Flip a byte in the AES ciphertext portion (after RSA key + nonce + tag)
        tampered = bytearray(ciphertext)
        tampered[-1] ^= 0xFF
        tampered = bytes(tampered)

        with pytest.raises(Exception):
            hybrid_crypto.decrypt(tampered, priv)

    def test_different_encryptions_produce_different_output(self):
        from app.crypto import hybrid_crypto, server_key_holder

        plaintext = b'Same input, different ciphertext each time'
        pub = server_key_holder.get_public_key()

        ct1 = hybrid_crypto.encrypt(plaintext, pub)
        ct2 = hybrid_crypto.encrypt(plaintext, pub)
        assert ct1 != ct2  # random AES key + nonce


class TestCryptoService:
    """Test the high-level crypto service."""

    def test_payment_encrypt_decrypt(self):
        from app.services import crypto_service
        from app.models.payment_instruction import PaymentInstruction

        payment = PaymentInstruction(
            sender_vpa='alice@upi',
            receiver_vpa='bob@upi',
            amount=50000,
            pin_hash='abcdef1234567890',
        )

        ct_b64 = crypto_service.encrypt_payment(payment)
        assert isinstance(ct_b64, str)

        decrypted = crypto_service.decrypt_payment(ct_b64)
        assert decrypted.sender_vpa == 'alice@upi'
        assert decrypted.receiver_vpa == 'bob@upi'
        assert decrypted.amount == 50000
        assert decrypted.nonce == payment.nonce


class TestMeshService:
    """Test the in-memory mesh simulator."""

    def setup_method(self):
        from app.services import mesh_service
        mesh_service.reset()

    def test_inject_and_status(self):
        from app.services import mesh_service
        from app.models.mesh_packet import MeshPacket

        pkt = MeshPacket(ciphertext_b64='dGVzdA==')  # base64 of 'test'
        assert mesh_service.inject_packet('phone-alice', pkt)

        devices = mesh_service.status()
        alice = [d for d in devices if d['name'] == 'phone-alice'][0]
        assert alice['packet_count'] == 1

    def test_gossip_spreads_to_all(self):
        from app.services import mesh_service
        from app.models.mesh_packet import MeshPacket

        pkt = MeshPacket(ciphertext_b64='dGVzdA==')
        mesh_service.inject_packet('phone-alice', pkt)

        result = mesh_service.gossip_round()
        assert result['new_deliveries'] == 4  # 4 other devices

        for d in result['devices']:
            assert d['packet_count'] == 1

    def test_ttl_decrements(self):
        from app.services import mesh_service
        from app.models.mesh_packet import MeshPacket

        pkt = MeshPacket(ciphertext_b64='dGVzdA==', ttl=5)
        mesh_service.inject_packet('phone-alice', pkt)

        mesh_service.gossip_round()
        devices = mesh_service.status()

        for d in devices:
            if d['name'] != 'phone-alice':
                # These received the packet with ttl=4 (decremented once)
                assert d['packets'][0]['ttl'] == 4

    def test_bridge_packets(self):
        from app.services import mesh_service
        from app.models.mesh_packet import MeshPacket

        pkt = MeshPacket(ciphertext_b64='dGVzdA==')
        mesh_service.inject_packet('phone-bridge', pkt)

        bridge_pkts = mesh_service.get_bridge_packets()
        assert len(bridge_pkts) == 1

    def test_dedup_within_device(self):
        from app.services import mesh_service
        from app.models.mesh_packet import MeshPacket

        pkt = MeshPacket(ciphertext_b64='dGVzdA==', packet_id='same-id')
        mesh_service.inject_packet('phone-alice', pkt)
        mesh_service.inject_packet('phone-alice', pkt)  # duplicate

        devices = mesh_service.status()
        alice = [d for d in devices if d['name'] == 'phone-alice'][0]
        assert alice['packet_count'] == 1  # still just 1

    def test_reset(self):
        from app.services import mesh_service
        from app.models.mesh_packet import MeshPacket

        pkt = MeshPacket(ciphertext_b64='dGVzdA==')
        mesh_service.inject_packet('phone-alice', pkt)
        mesh_service.reset()

        devices = mesh_service.status()
        for d in devices:
            assert d['packet_count'] == 0


class TestIdempotencyService:
    """Test the SHA-256 deduplication service."""

    def setup_method(self):
        from app.services import idempotency_service
        idempotency_service.reset()

    def test_first_claim_succeeds(self):
        from app.services import idempotency_service
        claimed, h = idempotency_service.try_claim(b'unique-payload')
        assert claimed is True
        assert len(h) == 64  # SHA-256 hex digest

    def test_second_claim_fails(self):
        from app.services import idempotency_service
        idempotency_service.try_claim(b'duplicate-payload')
        claimed, _ = idempotency_service.try_claim(b'duplicate-payload')
        assert claimed is False

    def test_different_payloads_both_succeed(self):
        from app.services import idempotency_service
        c1, _ = idempotency_service.try_claim(b'payload-A')
        c2, _ = idempotency_service.try_claim(b'payload-B')
        assert c1 is True
        assert c2 is True

    def test_reset_allows_reclaim(self):
        from app.services import idempotency_service
        idempotency_service.try_claim(b'will-reset')
        idempotency_service.reset()
        claimed, _ = idempotency_service.try_claim(b'will-reset')
        assert claimed is True


class TestPaymentInstruction:
    """Test model serialisation."""

    def test_roundtrip(self):
        from app.models.payment_instruction import PaymentInstruction

        p = PaymentInstruction(
            sender_vpa='alice@upi',
            receiver_vpa='bob@upi',
            amount=50000,
            pin_hash='abc123',
        )

        json_str = p.to_json()
        p2 = PaymentInstruction.from_json(json_str)
        assert p2.sender_vpa == p.sender_vpa
        assert p2.amount == p.amount
        assert p2.nonce == p.nonce

    def test_bytes_roundtrip(self):
        from app.models.payment_instruction import PaymentInstruction

        p = PaymentInstruction(
            sender_vpa='charlie@upi',
            receiver_vpa='dave@upi',
            amount=100,
            pin_hash='xyz',
        )

        data = p.to_bytes()
        p2 = PaymentInstruction.from_bytes(data)
        assert p2.receiver_vpa == 'dave@upi'


class TestMeshPacket:
    """Test MeshPacket serialisation."""

    def test_to_dict_and_back(self):
        from app.models.mesh_packet import MeshPacket

        pkt = MeshPacket(ciphertext_b64='dGVzdA==', ttl=3)
        d = pkt.to_dict()
        pkt2 = MeshPacket.from_dict(d)
        assert pkt2.packet_id == pkt.packet_id
        assert pkt2.ttl == 3
        assert pkt2.ciphertext_bytes == b'test'

    def test_clone_is_independent(self):
        from app.models.mesh_packet import MeshPacket

        pkt = MeshPacket(ciphertext_b64='dGVzdA==')
        clone = pkt.clone()
        clone.hops.append('extra')
        assert 'extra' not in pkt.hops
