"""
Dashboard routes — serve the single-page HTML dashboard.
"""

from flask import Blueprint, render_template

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/')
@dashboard_bp.route('/dashboard')
def index():
    """Serve the main demo dashboard."""
    return render_template('dashboard.html')
