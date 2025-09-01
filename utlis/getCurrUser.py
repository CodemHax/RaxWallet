from fastapi import Depends , HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

from config import Config
from core.database.transaction_db import GetUserByUsername
from core.models.models import UserInDB

oauth2= OAuth2PasswordBearer(tokenUrl="/auth/login")

async def getUser(token: str = Depends(oauth2)) -> UserInDB:
    error = HTTPException(status_code=401, detail="Invalid token" , headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, Config.secret_key, algorithms=[Config.ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise error
    except JWTError:
        raise error

    user = await GetUserByUsername(username=username)
    if user is None:
        raise error
    return user