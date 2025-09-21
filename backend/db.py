import sqlite3
from typing import List, Tuple, Any

DB_FILE = "finance.db"

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    # Cash Accounts
    c.execute('''CREATE TABLE IF NOT EXISTS cash_accounts (
        name TEXT PRIMARY KEY,
        balance REAL NOT NULL
    )''')
    # Treasury lots: each cash addition is a lot
    c.execute('''CREATE TABLE IF NOT EXISTS treasury_lots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        purchase_date TEXT NOT NULL
    )''')
    # Treasury yields: one per type
    c.execute('''CREATE TABLE IF NOT EXISTS treasury_yields (
        type TEXT PRIMARY KEY,
        interest_rate REAL NOT NULL
    )''')
    # Retirement Accounts
    c.execute('''CREATE TABLE IF NOT EXISTS retirement_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        balance REAL DEFAULT 0.0
    )''')
    # IRA Holdings
    c.execute('''CREATE TABLE IF NOT EXISTS ira_holdings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        shares REAL NOT NULL,
        FOREIGN KEY(account_id) REFERENCES retirement_accounts(id) ON DELETE CASCADE
    )''')
    # Equities
    c.execute('''CREATE TABLE IF NOT EXISTS equities (
        ticker TEXT PRIMARY KEY,
        shares REAL NOT NULL
    )''')
    conn.commit()
    conn.close()
