from core.database.db import get_db
from core.models.models import UserInDB
from pymongo.errors import DuplicateKeyError
from utlis.walletex import WalletEx
from typing import Optional
from bson import ObjectId
from datetime import datetime
import uuid


async def LoginUser(username: str) -> Optional[UserInDB]:
    db = get_db()
    user_doc = await db.users.find_one({"username": username})
    if user_doc:
        user_doc["_id"] = str(user_doc["_id"])
        return UserInDB(**user_doc)
    return None

async def RegisterUser(phoneNumber: str, username: str, hashed_password: str, email: str, full_name: str) -> bool | str:
    db = get_db()
    walletex = WalletEx()

    wallet_id = await walletex.walletIdGen(14)

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

async def GetUserByUsername(username: str) -> Optional[UserInDB]:
    db = get_db()
    user_doc = await db.users.find_one({"username": username})
    if user_doc:
        user_doc["_id"] = str(user_doc["_id"])
        return UserInDB(**user_doc)
    return None

async def GetUserByWalletId(wallet_id: str) -> Optional[UserInDB]:
    db = get_db()
    user_doc = await db.users.find_one({"wallet_id": wallet_id})
    if user_doc:
        user_doc["_id"] = str(user_doc["_id"])
        return UserInDB(**user_doc)
    return None

async def GetUserDocByWalletId(wallet_id: str) -> dict | None:
    db = get_db()
    doc = await db.users.find_one({"wallet_id": wallet_id})
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])
    doc.pop("hashed_password", None)
    return doc

async def UpdateUserBalance(user_id: str, new_balance: float) -> bool:
    db = get_db()
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"balance": new_balance}}
    )
    return result.modified_count > 0

async def UpdateUserBalanceByWalletId(wallet_id: str, new_balance: float) -> bool:
    db = get_db()
    result = await db.users.update_one(
        {"wallet_id": wallet_id},
        {"$set": {"balance": new_balance}}
    )
    return result.modified_count > 0


async def sendMoney(from_wallet_id: str, to_wallet_id: str, amount: float) -> bool:
    db = get_db()
    from_user = await db.users.find_one({"wallet_id": from_wallet_id})
    to_user = await db.users.find_one({"wallet_id": to_wallet_id})

    if not from_user or not to_user:
        return False

    if from_user["balance"] < amount:
        return False

    new_from_balance = from_user["balance"] - amount
    new_to_balance = to_user["balance"] + amount

    async with await db.client.start_session() as session:
        async with session.start_transaction():
            await db.users.update_one(
                {"wallet_id": from_wallet_id},
                {"$set": {"balance": new_from_balance}},
                session=session
            )
            await db.users.update_one(
                {"wallet_id": to_wallet_id},
                {"$set": {"balance": new_to_balance}},
                session=session
            )
    return True

async def transactionHistory(wallet_id: str) -> Optional[list]:
    db = get_db()
    user_doc = await db.users.find_one({"wallet_id": wallet_id}, {"transactions": 1, "_id": 0})
    if user_doc and "transactions" in user_doc:
        return user_doc["transactions"]
    return None

async def addTransaction(wallet_id: str, amount: float, tx_type: str, balance_after: float) -> bool:
    db = get_db()
    tx = {
        "id": str(uuid.uuid4()),
        "amount": amount,
        "type": tx_type,
        "balance_after": balance_after,
        "created_at": datetime.utcnow().isoformat() + 'Z'
    }
    result = await db.users.update_one(
        {"wallet_id": wallet_id},
        {"$push": {"transactions": {"$each": [tx], "$position": 0}}}
    )
    return result.modified_count > 0

async def crt_index():
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.users.create_index("phoneNumber", unique=True)
