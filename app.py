import streamlit as st
import db
import data_fetcher
import constants
from treasury import add_treasury, remove_treasury, calculate_current_value
from constants import TREASURIES
from retirement import add_retirement, remove_retirement
from constants import RETIREMENT_ACCOUNTS

# Initialize database and load portfolio
db.init_db()

# --- Ensure cash account session state is always initialized and loaded from DB ---
cash_types = ["SWVXX", "SPAXX", "Checking"]


# ---------------- Sidebar Navigation ----------------
st.sidebar.title("Navigation")
page = st.sidebar.radio("Go to", ["Dashboard", "Manage Portfolio", "Treasuries", "Retirement Accounts"])


# ---------------- Helper: Price Update ----------------
# Initialize session state flags
if "prices_updated" not in st.session_state:
    st.session_state.prices_updated = False

def maybe_update_prices():
    """Update prices only if they haven't been updated this session."""
    if not st.session_state.prices_updated:
        data_fetcher.update_all_stock_prices()
        st.session_state.prices_updated = True

# ---------------- Dashboard Page ----------------
if page == "Dashboard":

    st.title("📊 My Financial Dashboard")

    # Manual refresh button
    if st.button("Refresh Prices"):
        st.session_state.prices_updated = False  # force update next render
        # Sync cash values from session state to constants.CASH_ACCOUNTS
        cash_types = ["SWVXX", "SPAXX", "Checking"]
        for cash_type in cash_types:
            key = f"cash_{cash_type}"
            if key in st.session_state:
                constants.CASH_ACCOUNTS[cash_type] = st.session_state[key]
        maybe_update_prices()

    maybe_update_prices()

    # Always load latest cash balances from DB
    db_cash = db.get_cash_accounts()
    for cash_type in cash_types:
        constants.CASH_ACCOUNTS[cash_type] = db_cash.get(cash_type, 0.0)
        st.session_state[f"cash_{cash_type}"] = db_cash.get(cash_type, 0.0)
    cash_total = sum(db_cash.get(c, 0.0) for c in cash_types)
    net_worth = data_fetcher.get_net_worth()

    # Portfolio summary
    portfolio_metrics = []
    if not constants.PORTFOLIO:
        portfolio_metrics.append(("No stocks in your portfolio yet.", "", ""))
    else:
        for symbol, shares in constants.PORTFOLIO.items():
            price = constants.STOCK_PRICES.get(symbol, 0.0)
            portfolio_metrics.append((f"{symbol} ({shares} shares)", f"${price:.2f}", f"Value: ${price * shares:.2f}"))

    # IRA summary
    accounts = db.get_retirement_accounts()
    ira_holdings = []
    for acc_id, name, acc_type, balance in accounts:
        if "IRA" in acc_type:
            holdings = db.get_ira_holdings(acc_id)
            for _, symbol, shares in holdings:
                ira_holdings.append((name, acc_type, symbol, shares))
    ira_metrics = []
    if not ira_holdings:
        ira_metrics.append(("No IRA equities yet.", "", ""))
    else:
        for ira_name, ira_type, symbol, shares in ira_holdings:
            price = constants.STOCK_PRICES.get(symbol.upper(), 0.0)
            ira_metrics.append((f"{ira_name} ({ira_type}) - {symbol} ({shares} shares)", f"${price:.2f}", f"Value: ${price * shares:.2f}"))

    # Cash summary
    cash_metrics = []
    for cash_type in cash_types:
        key = f"cash_{cash_type}"
        balance = st.session_state.get(key, 0.0)
        cash_metrics.append((f"{cash_type} Balance", f"${balance:,.2f}", ""))

    # Make the entire dashboard page (title, buttons, cards) wide
    st.markdown("""
        <style>
        .block-container {
            max-width: 2200px !important;
            width: 70vw !important;
            margin-left: auto !important;
            margin-right: auto !important;
        }
        # .dashboard-card {
        #     border: 3px solid #333;
        #     border-radius: 18px;
        #     background: #f7fafd;
        #     box-shadow: 0 6px 24px rgba(0,0,0,0.13);
        #     padding: 2.2rem 1.5rem 1.5rem 1.5rem;
        #     min-width: 0;
        #     min-height: 250px;
        #     height: 100%;
        #     flex: 1 1 0;
        #     display: flex;
        #     flex-direction: column;
        #     justify-content: flex-start;
        # }
        </style>
    """, unsafe_allow_html=True)
    cols = st.columns(4, gap="large")
    with cols[0]:
        st.markdown('<div class="dashboard-card">', unsafe_allow_html=True)
        st.markdown("#### Net Worth")
        st.metric(label="Total Net Worth (including cash)", value=f"${net_worth + cash_total:,.2f}")
        st.markdown('</div>', unsafe_allow_html=True)
    with cols[1]:
        st.markdown('<div class="dashboard-card">', unsafe_allow_html=True)
        st.markdown("#### Portfolio")
        for label, value, delta in portfolio_metrics:
            st.metric(label=label, value=value, delta=delta)
        st.markdown('</div>', unsafe_allow_html=True)
    with cols[2]:
        st.markdown('<div class="dashboard-card">', unsafe_allow_html=True)
        st.markdown("#### IRA Account Equities")
        for label, value, delta in ira_metrics:
            st.metric(label=label, value=value, delta=delta)
        st.markdown('</div>', unsafe_allow_html=True)
    with cols[3]:
        st.markdown('<div class="dashboard-card">', unsafe_allow_html=True)
        st.markdown("#### Cash Accounts")
        for label, value, _ in cash_metrics:
            st.metric(label=label, value=value)
        st.markdown('</div>', unsafe_allow_html=True)

# ---------------- Manage Portfolio Page ----------------
elif page == "Manage Portfolio":
    st.title("📝 Manage Portfolio")

    st.subheader("Add Stock")
    with st.form("add_stock_form"):
        symbol_input = st.text_input("Stock symbol (e.g. AAPL)")
        shares_input = st.number_input("Number of shares", min_value=0.0, step=1.0)
        submitted = st.form_submit_button("Add/Update Stock")
        if submitted and symbol_input and shares_input > 0:
            db.add_stock(symbol_input.strip().upper(), shares_input)
            st.success(f"{shares_input} shares of {symbol_input.upper()} added!")
            # Reset session flag so dashboard updates prices
            st.session_state.prices_updated = False

    st.subheader("Current Portfolio")
    if not constants.PORTFOLIO:
        st.info("No stocks yet.")
    else:
        for symbol, shares in list(constants.PORTFOLIO.items()):
            col1, col2, col3 = st.columns([2, 2, 1])
            col1.write(symbol)
            col2.write(f"{shares} shares")
            if col3.button("Remove", key=symbol):
                db.remove_stock(symbol)
                st.session_state.prices_updated = False
                st.rerun()

    # --- Cash Balances Section ---
    st.subheader("Cash Balances")
    cash_types = ["SWVXX", "SPAXX", "Checking"]
    cash_changed = False
    for cash_type in cash_types:
        key = f"portfolio_cash_{cash_type}"
        if key not in st.session_state:
            st.session_state[key] = constants.CASH_ACCOUNTS.get(cash_type, 0.0)
        new_val = st.number_input(f"{cash_type} Balance ($)", min_value=0.0, value=st.session_state[key], step=100.0, key=key)
        if new_val != constants.CASH_ACCOUNTS.get(cash_type, 0.0):
            cash_changed = True
    if st.button("Save Cash Balances"):
        for cash_type in cash_types:
            key = f"portfolio_cash_{cash_type}"
            val = st.session_state[key]
            constants.CASH_ACCOUNTS[cash_type] = val
            db.set_cash_account(cash_type, val)
            # Also update the dashboard session state key
            dash_key = f"cash_{cash_type}"
            st.session_state[dash_key] = val
        st.success("Cash balances updated!")
elif page == "Treasuries":
    st.title("💵 Treasury Securities")

    st.subheader("Add Treasury")
    with st.form("add_treasury_form"):
        name = st.text_input("Name (e.g., T-Bill 2026)")
        face_value = st.number_input("Face Value ($)", min_value=0.0, step=100.0)
        interest_rate = st.number_input("Interest Rate (%)", min_value=0.0, max_value=100.0, step=0.01)
        purchase_date = st.date_input("Purchase Date")
        maturity_date = st.date_input("Maturity Date")
        submitted = st.form_submit_button("Add Treasury")
        if submitted:
            add_treasury(
                name,
                face_value,
                interest_rate / 100,
                purchase_date.isoformat(),
                maturity_date.isoformat()
            )
            st.success(f"Treasury '{name}' added!")

    st.subheader("Current Treasuries")
    if not TREASURIES:
        st.info("No treasuries added yet.")
    else:
        for name, data in TREASURIES.items():
            value = calculate_current_value(name)
            st.metric(label=name, value=f"${value:,.2f}", delta=f"Face: ${data['face_value']}")
            if st.button("Remove", key=name):
                remove_treasury(name)
elif page == "Retirement Accounts":
    st.title("🏦 Retirement Accounts")

    st.subheader("Add Retirement Account")
    with st.form("add_retirement_account_form"):
        name = st.text_input("Account Name (e.g. Vanguard IRA)")
        acc_type = st.selectbox("Account Type", ["401k_traditional", "401k_roth", "IRA_traditional", "IRA_roth"])
        balance = st.number_input("Balance ($)", min_value=0.0, step=100.0)
        submitted = st.form_submit_button("Add Account")
        if submitted and name:
            db.add_retirement_account(name, acc_type, balance)
            st.success(f"{name} ({acc_type}) added!")
            st.rerun()

    st.subheader("Your Retirement Accounts")
    accounts = db.get_retirement_accounts()
    if not accounts:
        st.info("No retirement accounts yet.")
    else:
        for acc_id, name, acc_type, balance in accounts:
            with st.expander(f"{name} ({acc_type})"):
                col1, col2 = st.columns([3,1])
                with col1:
                    new_balance = st.number_input(f"Update Balance for {name}", min_value=0.0, value=balance, key=f"bal_{acc_id}")
                    if st.button(f"Update Balance", key=f"update_{acc_id}"):
                        db.update_retirement_account_balance(acc_id, new_balance)
                        st.success("Balance updated!")
                        st.rerun()
                with col2:
                    if st.button("Remove Account", key=f"remove_{acc_id}"):
                        db.remove_retirement_account(acc_id)
                        st.success("Account removed!")
                        st.rerun()

                # IRA equities management
                if "IRA" in acc_type:
                    st.markdown("**IRA Holdings**")
                    holdings = db.get_ira_holdings(acc_id)
                    ira_total = 0.0
                    for holding_id, symbol, shares in holdings:
                        price = constants.STOCK_PRICES.get(symbol.upper(), 0.0)
                        ira_total += price * shares
                    st.info(f"Total IRA Equities Value: ${ira_total:,.2f}")

                    # Cash in IRA
                    cash_key = f"ira_cash_{acc_id}"
                    ira_cash = st.number_input("Cash in IRA ($)", min_value=0.0, value=balance, key=cash_key)
                    if st.button("Update IRA Cash", key=f"update_cash_{acc_id}"):
                        db.update_retirement_account_balance(acc_id, ira_cash)
                        st.success("IRA cash updated!")
                        st.rerun()

                    if not holdings:
                        st.info("No equities in this IRA yet.")
                    else:
                        for holding_id, symbol, shares in holdings:
                            colh1, colh2, colh3 = st.columns([2,2,1])
                            colh1.write(symbol)
                            colh2.write(f"{shares} shares @ ${constants.STOCK_PRICES.get(symbol.upper(), 0.0):.2f}")
                            if colh3.button("Remove", key=f"remove_holding_{holding_id}"):
                                db.remove_ira_holding(holding_id)
                                st.success("Equity removed!")
                                st.rerun()
                    st.markdown("---")
                    st.markdown("**Add Equity to IRA**")
                    with st.form(f"add_ira_holding_form_{acc_id}"):
                        symbol = st.text_input("Stock Symbol", key=f"ira_symbol_{acc_id}")
                        shares = st.number_input("Shares", min_value=0.0, step=1.0, key=f"ira_shares_{acc_id}")
                        submitted_holding = st.form_submit_button("Add Equity")
                        if submitted_holding and symbol and shares > 0:
                            db.add_ira_holding(acc_id, symbol, shares)
                            st.success(f"Added {shares} shares of {symbol.upper()} to {name}")
                            st.rerun()
