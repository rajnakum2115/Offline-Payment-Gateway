"""
Core API routes — the four demo steps plus data endpoints.

  POST /api/payment/inject   — Step 1: compose & encrypt a payment, inject into mesh
  POST /api/mesh/gossip      — Step 2: run one gossip round
  POST /api/bridge/ingest    — Step 3: bridge uploads packets to backend
  POST /api/mesh/reset       — Reset everything for a fresh demo
  GET  /api/mesh/status      — current mesh device states
  GET  /api/accounts         — account balances
  GET  /api/transactions     — transaction ledger
"""

import hashlib

from flask import Blueprint, request, jsonify

from app.models.payment_instruction import PaymentInstruction
from app.models.mesh_packet import MeshPacket
from app.services import crypto_service, mesh_service, bridge_service, idempotency_service
from app.utils.validators import validate_vpa, validate_amount, validate_pin
from app.utils.helpers import paise_from_rupees
from app.repositories import account_repository, transaction_repository
from app.database.db import reset_db

api_bp = Blueprint('api', __name__, url_prefix='/api')


# ── Step 1: Compose & Inject ──────────────────────────────────────

@api_bp.route('/payment/inject', methods=['POST'])
def inject_payment():
    """
    Compose a PaymentInstruction, hybrid-encrypt it, wrap it in a
    MeshPacket, and inject it onto phone-alice.
    """
    data = request.get_json(force=True)

    sender = data.get('sender_vpa', '')
    receiver = data.get('receiver_vpa', '')
    amount = data.get('amount', 0)
    pin = data.get('pin', '')

    # Validate
    for validator, value in [
        (validate_vpa, sender),
        (validate_vpa, receiver),
        (validate_amount, amount),
        (validate_pin, pin),
    ]:
        ok, msg = validator(value)
        if not ok:
            return jsonify({'error': msg}), 400

    if sender == receiver:
        return jsonify({'error': 'Sender and receiver cannot be the same'}), 400

    # Build the payment instruction
    amount_paise = paise_from_rupees(float(amount))
    pin_hash = hashlib.sha256(pin.encode()).hexdigest()

    payment = PaymentInstruction(
        sender_vpa=sender,
        receiver_vpa=receiver,
        amount=amount_paise,
        pin_hash=pin_hash,
    )

    # Encrypt → base64 ciphertext
    ciphertext_b64 = crypto_service.encrypt_payment(payment)

    # Wrap in a MeshPacket
    packet = MeshPacket(ciphertext_b64=ciphertext_b64)

    # Inject onto phone-alice (the sender's device)
    mesh_service.inject_packet('phone-alice', packet)

    return jsonify({
        'message': 'Payment encrypted and injected into mesh',
        'packet': packet.to_dict(),
        'payment_summary': {
            'sender': sender,
            'receiver': receiver,
            'amount_rupees': float(amount),
            'amount_paise': amount_paise,
            'nonce': payment.nonce,
        },
        'mesh': mesh_service.status(),
    })


# ── Step 2: Gossip Round ─────────────────────────────────────────

@api_bp.route('/mesh/gossip', methods=['POST'])
def gossip_round():
    """Run one gossip round across the mesh."""
    result = mesh_service.gossip_round()
    return jsonify({
        'message': f'Gossip round complete — {result["new_deliveries"]} new deliveries',
        'gossip': result,
    })


# ── Step 3: Bridge Uploads ───────────────────────────────────────

@api_bp.route('/bridge/ingest', methods=['POST'])
def bridge_ingest():
    """
    Simulate bridge device(s) walking outside and uploading all their
    packets to the backend.
    """
    packets = mesh_service.get_bridge_packets()
    if not packets:
        return jsonify({'message': 'No packets on bridge devices', 'results': []})

    results = []
    for pkt in packets:
        result = bridge_service.ingest_packet(pkt.ciphertext_b64)
        result['packet_id'] = pkt.packet_id
        results.append(result)

    # Clear bridge buffers after upload
    mesh_service.clear_bridge_packets()

    return jsonify({
        'message': f'Bridge uploaded {len(packets)} packet(s)',
        'results': results,
        'accounts': account_repository.get_all_accounts(),
        'transactions': transaction_repository.get_all_transactions(),
    })


# ── Reset ────────────────────────────────────────────────────────

@api_bp.route('/mesh/reset', methods=['POST'])
def reset_mesh():
    """Reset everything: mesh, idempotency cache, database."""
    mesh_service.reset()
    idempotency_service.reset()
    reset_db()
    return jsonify({
        'message': 'Mesh, idempotency cache, and database reset',
        'mesh': mesh_service.status(),
        'accounts': account_repository.get_all_accounts(),
    })


# ── Data Endpoints ───────────────────────────────────────────────

@api_bp.route('/mesh/status', methods=['GET'])
def mesh_status():
    return jsonify({'devices': mesh_service.status()})


@api_bp.route('/accounts', methods=['GET'])
def get_accounts():
    return jsonify({'accounts': account_repository.get_all_accounts()})


@api_bp.route('/transactions', methods=['GET'])
def get_transactions():
    return jsonify({'transactions': transaction_repository.get_all_transactions()})
