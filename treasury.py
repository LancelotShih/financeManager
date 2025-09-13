from constants import TREASURIES

from datetime import datetime

def add_treasury(name: str, face_value: float, interest_rate: float, purchase_date: str, maturity_date: str):
    TREASURIES[name] = {
        "face_value": face_value,
        "interest_rate": interest_rate,
        "purchase_date": purchase_date,
        "maturity_date": maturity_date
    }

def remove_treasury(name: str):
    if name in TREASURIES:
        del TREASURIES[name]

def calculate_current_value(name: str) -> float:
    
    # Calculates the current value of a treasury using simple interest.
    # For T-bills, you can just return face_value; for notes/bonds, calculate accrued interest.
    
    t = TREASURIES[name]
    face = t["face_value"]
    rate = t["interest_rate"]
    purchase = datetime.fromisoformat(t["purchase_date"])
    today = datetime.today()
    days_held = (today - purchase).days
    # Simple interest approximation
    value = face * (1 + rate * days_held / 365)
    return round(value, 2)

def calculate_total_treasuries_value():
    total = 0.0
    for name in TREASURIES:
        total += calculate_current_value(name)
    return total
