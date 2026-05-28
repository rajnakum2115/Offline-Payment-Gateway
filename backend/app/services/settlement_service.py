"""
Settlement service — executes the debit/credit for a verified payment.

Called by the bridge service after decryption and validation.
"""

from app.repositories import account_repository, transaction_repository
from app.models.payment_instruction import PaymentInstruction
from app.models.transaction import STATUS_SETTLED, STATUS_FAILED


def settle(payment: PaymentInstruction, ciphertext_hash: str) -> dict:
    """
    Atomically transfer *payment.amount* paise from sender to receiver.

    Returns a dict with 'status' and 'tx' (the transaction record) on
    success, or 'status' and 'reason' on failure.
    """
    # Attempt the atomic transfer
    ok = account_repository.transfer(
        sender_vpa=payment.sender_vpa,
        receiver_vpa=payment.receiver_vpa,
        amount=payment.amount,
    )

    if not ok:
        # Record the failure in the ledger too
        tx = transaction_repository.create_transaction(
            sender_vpa=payment.sender_vpa,
            receiver_vpa=payment.receiver_vpa,
            amount=payment.amount,
            status=STATUS_FAILED,
            ciphertext_hash=ciphertext_hash,
        )
        return {
            'status': STATUS_FAILED,
            'reason': 'Insufficient balance or unknown account',
            'tx': tx,
        }

    # Record the successful settlement
    tx = transaction_repository.create_transaction(
        sender_vpa=payment.sender_vpa,
        receiver_vpa=payment.receiver_vpa,
        amount=payment.amount,
        status=STATUS_SETTLED,
        ciphertext_hash=ciphertext_hash,
    )

    return {'status': STATUS_SETTLED, 'tx': tx}
