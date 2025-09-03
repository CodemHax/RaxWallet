def validate_amount(amount) -> tuple[bool, dict]:
    try:
        amount = float(amount)
        if amount <= 0:
            return False, {"reason": "amount", "message": "Amount must be greater than zero."}
        elif amount > 1000000:
            return False, {"reason": "amount", "message": "Amount must be less than 1 million."}
        elif amount % 1 != 0:
            return False, {"reason": "amount", "message": "Amount must be a whole number."}
        else:
           return True, {"reason": "amount", "message": "Amount is valid."}
    except ValueError:
        return False, {"reason": "amount", "message": "Invalid amount."}

def validate_request_id(req_id: str) -> str:
    if not req_id or not req_id.strip():
        raise ValueError("Request ID is required")
    return req_id


def validate_wallet_id(wallet_id: str) -> str:
    if not wallet_id or not wallet_id.strip():
        raise ValueError("Wallet ID is required")
    return wallet_id



async def validatePass(password):
    min_length = 8
    special_chars = "!@#$%^&*"
    if len(password) < min_length:
        return False, {"reason": "length", "message": "Password must be at least 8 characters long."}
    has_lower = any(c.islower() for c in password)
    has_upper = any(c.isupper() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in special_chars for c in password)
    if not has_lower:
        return False, {"reason": "lowercase", "message": "Password must contain at least one lowercase letter."}
    if not has_upper:
        return False, {"reason": "uppercase", "message": "Password must contain at least one uppercase letter."}
    if not has_digit:
        return False, {"reason": "digit", "message": "Password must contain at least one digit."}
    if not has_special:
        return False, {"reason": "special", "message": "Password must contain at least one special character: " + special_chars}
    return True, {"reason": "valid", "message": "Password is valid."}
