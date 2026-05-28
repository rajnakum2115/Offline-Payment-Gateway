"""
Application factory — creates and configures the Flask app.
"""

from flask import Flask

from app.config.config import Config
from app.database.db import init_db


def create_app(testing=False) -> Flask:
    """
    Build and return a fully configured Flask application.

    Args:
        testing: if True, uses a temporary in-memory database.
    """
    app = Flask(__name__, template_folder='templates')
    app.config.from_object(Config)

    if testing:
        # Override to use an in-memory SQLite for tests
        import app.database.db as db_module
        import tempfile, os
        db_module._db_path = os.path.join(tempfile.mkdtemp(), 'test_mesh.db')

    # Initialise database (create tables + seed if empty)
    init_db()

    # Register blueprints
    from app.routes.api_routes import api_bp
    from app.routes.dashboard_routes import dashboard_bp
    from app.routes.auth_routes import auth_bp

    app.register_blueprint(api_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(auth_bp)

    return app
