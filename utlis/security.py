from passlib.context import CryptContext

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def hash_password(password: str) -> str:
    return password_context.hash(password)


async def check_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return password_context.verify(plain_password, hashed_password)
    except Exception:
        return False


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
