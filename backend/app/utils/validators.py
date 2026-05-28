"""
Input validators for API endpoints.
"""

import re

_VPA_PATTERN = re.compile(r'^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$')


def validate_vpa(vpa: str) -> tuple[bool, str]:
    """Validate a UPI Virtual Payment Address."""
    if not vpa or not isinstance(vpa, str):
        return False, 'VPA is required'
    if not _VPA_PATTERN.match(vpa):
        return False, f'Invalid VPA format: {vpa}'
    return True, ''


def validate_amount(amount) -> tuple[bool, str]:
    """Validate a payment amount (in rupees, from user input)."""
    try:
        val = float(amount)
    except (TypeError, ValueError):
        return False, 'Amount must be a number'
    if val <= 0:
        return False, 'Amount must be positive'
    if val > 100_000:
        return False, 'Amount exceeds ₹1,00,000 limit'
    return True, ''


def validate_pin(pin: str) -> tuple[bool, str]:
    """Validate a UPI PIN (4 or 6 digits)."""
    if not pin or not isinstance(pin, str):
        return False, 'PIN is required'
    if not re.match(r'^\d{4,6}$', pin):
        return False, 'PIN must be 4-6 digits'
    return True, ''
