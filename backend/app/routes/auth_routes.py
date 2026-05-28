"""
Auth routes — placeholder for future PIN/OTP verification.

Not needed for the demo, but the scaffold is here for expansion.
"""

from flask import Blueprint, jsonify

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/verify-pin', methods=['POST'])
def verify_pin():
    """
    Placeholder — in a real system this would verify the UPI PIN
    against the user's bank.  For the demo, encryption + mesh
    routing is the focus, so PIN verification is simulated.
    """
    return jsonify({
        'message': 'PIN verification is simulated in this demo',
        'verified': True,
    })
