# UPI Offline Mesh — Backend

A Python backend that demonstrates **offline UPI payments routed through a Bluetooth-style mesh network**.

## Quick Start

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Run the server
python run.py
```

Open **http://localhost:5000/dashboard** in your browser.

## Demo Walkthrough

| Step | Button | What Happens |
|------|--------|-------------|
| 1 | 📤 Inject into Mesh | Compose a payment, encrypt with RSA+AES-GCM, inject onto phone-alice |
| 2 | 🔄 Run Gossip Round | Each device broadcasts packets to neighbours (TTL decrements) |
| 3 | 📡 Bridges Upload | phone-bridge (the one with internet) uploads to the backend |
| 4 | ♻️ Reset | Clear mesh, idempotency cache, and database |

## Architecture

- **Hybrid Encryption**: AES-256-GCM for payload, RSA-OAEP-SHA256 for the AES key
- **Mesh Simulator**: 5 in-memory virtual devices with gossip-style broadcasting
- **Idempotency**: SHA-256 hash of ciphertext + atomic compare-and-set
- **Settlement**: Atomic debit/credit in SQLite with WAL mode

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payment/inject` | Compose, encrypt, inject into mesh |
| POST | `/api/mesh/gossip` | Run one gossip round |
| POST | `/api/bridge/ingest` | Bridge uploads packets to backend |
| POST | `/api/mesh/reset` | Reset everything |
| GET | `/api/mesh/status` | Current mesh state |
| GET | `/api/accounts` | Account balances |
| GET | `/api/transactions` | Transaction ledger |

## Running Tests

```bash
python -m pytest tests/ -v
```
