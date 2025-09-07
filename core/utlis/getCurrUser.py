from fastapi import Depends , HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

from config import Config
from core.database.transaction_db import GetUserByUsername
from core.models.models import UserInDB

oauth2= OAuth2PasswordBearer(tokenUrl="/auth/login")

invalid =  HTTPException(status_code=401, detail="Invalid token" , headers={"WWW-Authenticate": "Bearer"})
async def getUser(token: str = Depends(oauth2)) -> UserInDB:
    try:
        payload = jwt.decode(
            token,
            Config.secret_key,
            algorithms=[Config.ALGORITHM],
            audience=Config.AUDIENCE,
            issuer=Config.ISSUER,
            options={"require": ["exp", "iat", "nbf", "sub", "typ"]}
        )
        if payload.get("typ") != "access":
            raise invalid
        username = payload.get("sub")
        if username is None:
            raise invalid
    except JWTError:
        raise invalid

    user = await GetUserByUsername(username=username)
    if user is None:
        raise invalid
    return user