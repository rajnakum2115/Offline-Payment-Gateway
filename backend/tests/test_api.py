"""
End-to-end API tests — walk through the full 4-step demo pipeline.
"""

import sys
import os
import pytest

# Ensure the backend package is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app


@pytest.fixture
def client():
    """Create a test client with a fresh temporary database."""
    app = create_app(testing=True)
    app.config['TESTING'] = True
    with app.test_client() as c:
        yield c


@pytest.fixture(autouse=True)
def reset_services():
    """Reset in-memory services before each test."""
    from app.services import mesh_service, idempotency_service
    mesh_service.reset()
    idempotency_service.reset()
    yield


class TestFullPipeline:
    """Walk through inject → gossip → bridge → verify settlement."""

    def _inject(self, client, sender='alice@upi', receiver='bob@upi', amount=500, pin='1234'):
        return client.post('/api/payment/inject', json={
            'sender_vpa': sender,
            'receiver_vpa': receiver,
            'amount': amount,
            'pin': pin,
        })

    def test_step1_inject(self, client):
        """Step 1: inject a payment into the mesh."""
        res = self._inject(client)
        assert res.status_code == 200
        data = res.get_json()
        assert data['payment_summary']['sender'] == 'alice@upi'
        assert data['payment_summary']['receiver'] == 'bob@upi'
        assert data['payment_summary']['amount_paise'] == 50000
        # phone-alice should now hold 1 packet
        mesh = data['mesh']
        alice = [d for d in mesh if d['name'] == 'phone-alice'][0]
        assert alice['packet_count'] == 1

    def test_step2_gossip(self, client):
        """Step 2: gossip spreads the packet to all devices."""
        self._inject(client)

        # Round 1: packet spreads to all 5 devices
        res = client.post('/api/mesh/gossip')
        assert res.status_code == 200
        data = res.get_json()
        assert data['gossip']['new_deliveries'] == 4  # 4 new devices get it

        # Every device should now hold the packet
        for d in data['gossip']['devices']:
            assert d['packet_count'] == 1, f'{d["name"]} has {d["packet_count"]} packets'

    def test_step3_bridge_settles(self, client):
        """Step 3: bridge uploads and payment is settled."""
        self._inject(client)
        client.post('/api/mesh/gossip')

        res = client.post('/api/bridge/ingest')
        assert res.status_code == 200
        data = res.get_json()

        assert len(data['results']) == 1
        assert data['results'][0]['status'] == 'SETTLED'

        # Check balances: alice should have lost ₹500, bob gained ₹500
        alice = [a for a in data['accounts'] if a['vpa'] == 'alice@upi'][0]
        bob   = [a for a in data['accounts'] if a['vpa'] == 'bob@upi'][0]
        assert alice['balance'] == 1_000_000 - 50_000  # 950000 paise
        assert bob['balance']   == 1_000_000 + 50_000  # 1050000 paise

        # Ledger should have 1 transaction
        assert len(data['transactions']) == 1
        assert data['transactions'][0]['status'] == 'SETTLED'

    def test_step4_idempotency(self, client):
        """Step 4: duplicate packet is rejected (settled exactly once)."""
        self._inject(client)
        client.post('/api/mesh/gossip')

        # First bridge upload → SETTLED
        res1 = client.post('/api/bridge/ingest')
        data1 = res1.get_json()
        assert data1['results'][0]['status'] == 'SETTLED'

        # Now gossip again — the non-bridge devices still hold the packet,
        # so gossip will re-spread it to the bridge.  When bridge uploads
        # again, the backend should reject it as DUPLICATE.
        client.post('/api/mesh/gossip')

        res2 = client.post('/api/bridge/ingest')
        data2 = res2.get_json()
        # The same packet arrives again — must be rejected as duplicate
        assert len(data2['results']) == 1
        assert data2['results'][0]['status'] == 'DUPLICATE'

    def test_different_payment_settles_after_first(self, client):
        """A second, distinct payment settles independently."""
        # First payment
        self._inject(client, sender='alice@upi', receiver='bob@upi', amount=500)
        client.post('/api/mesh/gossip')
        res1 = client.post('/api/bridge/ingest')
        assert res1.get_json()['results'][0]['status'] == 'SETTLED'

        # Reset mesh (not DB/idempotency) — clear device buffers only
        from app.services import mesh_service
        mesh_service.reset()

        # Second payment — different nonce → different ciphertext
        self._inject(client, sender='charlie@upi', receiver='dave@upi', amount=100)
        client.post('/api/mesh/gossip')
        res2 = client.post('/api/bridge/ingest')
        assert res2.get_json()['results'][0]['status'] == 'SETTLED'

    def test_validation_same_sender_receiver(self, client):
        """Sender and receiver cannot be the same."""
        res = self._inject(client, sender='alice@upi', receiver='alice@upi')
        assert res.status_code == 400
        assert 'same' in res.get_json()['error'].lower()

    def test_validation_bad_amount(self, client):
        """Amount must be positive."""
        res = self._inject(client, amount=-100)
        assert res.status_code == 400

    def test_validation_bad_pin(self, client):
        """PIN must be 4-6 digits."""
        res = self._inject(client, pin='ab')
        assert res.status_code == 400


class TestMeshReset:
    """Test the reset endpoint."""

    def test_reset_clears_everything(self, client):
        """After reset, mesh is empty and balances are restored."""
        # Inject and settle a payment
        client.post('/api/payment/inject', json={
            'sender_vpa': 'alice@upi', 'receiver_vpa': 'bob@upi',
            'amount': 500, 'pin': '1234',
        })
        client.post('/api/mesh/gossip')
        client.post('/api/bridge/ingest')

        # Reset
        res = client.post('/api/mesh/reset')
        assert res.status_code == 200
        data = res.get_json()

        # Mesh should be empty
        for d in data['mesh']:
            assert d['packet_count'] == 0

        # Balances should be restored to ₹10,000 each
        for a in data['accounts']:
            assert a['balance'] == 1_000_000


class TestDataEndpoints:
    """Test the GET data endpoints."""

    def test_mesh_status(self, client):
        res = client.get('/api/mesh/status')
        assert res.status_code == 200
        assert len(res.get_json()['devices']) == 5

    def test_accounts(self, client):
        res = client.get('/api/accounts')
        assert res.status_code == 200
        assert len(res.get_json()['accounts']) == 5

    def test_transactions_initially_empty(self, client):
        res = client.get('/api/transactions')
        assert res.status_code == 200
        assert len(res.get_json()['transactions']) == 0
