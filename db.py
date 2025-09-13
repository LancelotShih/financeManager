# --- Cash Accounts DB Functions ---
def get_cash_accounts():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT name, balance FROM cash_accounts')
    rows = c.fetchall()
    conn.close()
    return {name: balance for name, balance in rows}

def set_cash_account(name: str, balance: float):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('INSERT OR REPLACE INTO cash_accounts (name, balance) VALUES (?, ?)', (name, balance))
    conn.commit()
    conn.close()
# --- Retirement Accounts DB Functions ---
def add_retirement_account(name: str, acc_type: str, balance: float = 0.0) -> int:
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('INSERT INTO retirement_accounts (name, type, balance) VALUES (?, ?, ?)', (name, acc_type, balance))
    conn.commit()
    account_id = c.lastrowid
    conn.close()
    return account_id

def get_retirement_accounts():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT id, name, type, balance FROM retirement_accounts')
    accounts = c.fetchall()
    conn.close()
    return accounts

def update_retirement_account_balance(account_id: int, balance: float):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('UPDATE retirement_accounts SET balance = ? WHERE id = ?', (balance, account_id))
    conn.commit()
    conn.close()

def remove_retirement_account(account_id: int):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('DELETE FROM retirement_accounts WHERE id = ?', (account_id,))
    conn.commit()
    conn.close()

# --- IRA Holdings DB Functions ---
def add_ira_holding(account_id: int, symbol: str, shares: float):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('INSERT INTO ira_holdings (account_id, symbol, shares) VALUES (?, ?, ?)', (account_id, symbol.upper(), shares))
    conn.commit()
    conn.close()

def get_ira_holdings(account_id: int):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT id, symbol, shares FROM ira_holdings WHERE account_id = ?', (account_id,))
    holdings = c.fetchall()
    conn.close()
    return holdings

def remove_ira_holding(holding_id: int):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('DELETE FROM ira_holdings WHERE id = ?', (holding_id,))
    conn.commit()
    conn.close()
import sqlite3
from constants import PORTFOLIO

DB_FILE = "portfolio.db"

def init_db():
    # Add cash_accounts table
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS cash_accounts (
            name TEXT PRIMARY KEY,
            balance REAL NOT NULL
        )
    ''')
    conn.commit()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS stocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            shares REAL NOT NULL
        )
    ''')
    # Add retirement_accounts table
    c.execute('''
        CREATE TABLE IF NOT EXISTS retirement_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL, -- e.g., IRA, 401k, etc.
            balance REAL DEFAULT 0.0
        )
    ''')
    # Add ira_holdings table (for equities inside IRA accounts)
    c.execute('''
        CREATE TABLE IF NOT EXISTS ira_holdings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            shares REAL NOT NULL,
            FOREIGN KEY(account_id) REFERENCES retirement_accounts(id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()
    # Load DB into in-memory constants
    load_portfolio_from_db()

def load_portfolio_from_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT symbol, shares FROM stocks')
    rows = c.fetchall()
    conn.close()
    # Update in-memory PORTFOLIO
    PORTFOLIO.clear()
    for symbol, shares in rows:
        PORTFOLIO[symbol] = shares

def add_stock(symbol: str, shares: float):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT shares FROM stocks WHERE symbol = ?', (symbol.upper(),))
    result = c.fetchone()
    if result:
        new_shares = result[0] + shares
        c.execute('UPDATE stocks SET shares = ? WHERE symbol = ?', (new_shares, symbol.upper()))
    else:
        c.execute('INSERT INTO stocks (symbol, shares) VALUES (?, ?)', (symbol.upper(), shares))
    conn.commit()
    conn.close()
    # Update in-memory PORTFOLIO
    load_portfolio_from_db()

def remove_stock(symbol: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('DELETE FROM stocks WHERE symbol = ?', (symbol.upper(),))
    conn.commit()
    conn.close()
    # Update in-memory PORTFOLIO
    load_portfolio_from_db()
