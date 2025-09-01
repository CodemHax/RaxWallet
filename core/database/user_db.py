from typing import Optional
from pymongo.errors import DuplicateKeyError
from core.database.db import get_db
from core.models.models import UserInDB
from utlis.walletex import WalletEx


async def LoginUser(username: str) -> Optional[UserInDB]:
    db = get_db()
    user_doc = await db.users.find_one({"username": username})
    if user_doc:
        user_doc["_id"] = str(user_doc["_id"])
        return UserInDB(**user_doc)
    return None

async def RegisterUser(phoneNumber: str, username: str, hashed_password: str, email: str, full_name: str) -> bool | str:
    db = get_db()
    ext = WalletEx()
    wallet_id = await ext.walletIdGen(14)

    user_doc = {
        "wallet_id": wallet_id,
        "phoneNumber": phoneNumber,
        "username": username,
        "hashed_password": hashed_password,
        "email": email,
        "full_name": full_name,
        "balance": 0.0,
        "transactions": []
    }

    try:
        result = await db.users.insert_one(user_doc)
        return bool(result.inserted_id)
    except DuplicateKeyError as e:
        error_msg = str(e)
        if "email" in error_msg:
            return "email"
        elif "username" in error_msg:
            return "username"
        elif "phoneNumber" in error_msg:
            return "phoneNumber"
        else:
            return "duplicate"


