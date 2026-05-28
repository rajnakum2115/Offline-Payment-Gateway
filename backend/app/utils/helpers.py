"""
Helper utilities used across the application.
"""

import uuid


def generate_nonce() -> str:
    """Generate a cryptographically random UUID4 nonce."""
    return str(uuid.uuid4())


def format_inr(paise: int) -> str:
    """
    Format an integer paise value as an INR string.

    >>> format_inr(50000)
    '₹500.00'
    >>> format_inr(123)
    '₹1.23'
    """
    rupees = paise / 100
    return f'₹{rupees:,.2f}'


def paise_from_rupees(rupees: float) -> int:
    """
    Convert a rupee amount (possibly from user input) to integer paise.

    >>> paise_from_rupees(500)
    50000
    """
    return int(round(rupees * 100))
