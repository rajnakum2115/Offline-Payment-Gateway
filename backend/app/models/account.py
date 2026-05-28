"""
Account model — represents a UPI account with a VPA and balance.

Balances are stored in *paise* (integer) to avoid floating-point issues.
₹10,000.00 = 1_000_000 paise.
"""


# Seed data — five demo accounts, each starting with ₹10,000
SEED_ACCOUNTS = [
    {'vpa': 'alice@upi',   'name': 'Alice',   'balance': 1_000_000},
    {'vpa': 'bob@upi',     'name': 'Bob',     'balance': 1_000_000},
    {'vpa': 'charlie@upi', 'name': 'Charlie', 'balance': 1_000_000},
    {'vpa': 'dave@upi',    'name': 'Dave',    'balance': 1_000_000},
    {'vpa': 'bridge@upi',  'name': 'Bridge',  'balance': 1_000_000},
]
