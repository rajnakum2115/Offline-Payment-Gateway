"""
Entry point — run the Flask development server.

Usage:
    python run.py
    -> http://localhost:5000/dashboard
"""

from app import create_app

app = create_app()

if __name__ == '__main__':
    print('\n  UPI Offline Mesh - Demo Server')
    print('  -------------------------------')
    print('  Dashboard: http://localhost:5000/dashboard')
    print('  API base:  http://localhost:5000/api\n')
    app.run(debug=True, host='0.0.0.0', port=5000)
