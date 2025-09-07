from jose import jwt
from datetime import datetime, timedelta, timezone
from  config import  Config

def create_access_token(data: dict, expires_minutes: int | None = None):
    to_encode = data.copy()
    minutes = expires_minutes if expires_minutes is not None else Config.ACCESS_TOKEN_EXPIRE_MINUTES
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=minutes)
    to_encode.update({
        "exp": expire,
        "iat": now,
        "nbf": now,
        "iss": Config.ISSUER,
        "aud": Config.AUDIENCE,
        "typ": "access"
    })
    encoded_jwt = jwt.encode(to_encode, Config.secret_key, algorithm=Config.ALGORITHM)
    return encoded_jwt