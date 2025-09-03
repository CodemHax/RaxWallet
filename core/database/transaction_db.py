import uuid
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from core.database.db import get_db
from core.models.models import UserInDB


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
        {"$set": {"balance": new_balance}},
        upsert=True
    )
    return result.modified_count > 0 or result.upserted_id is not None

async def UpdateUserBalanceByWalletId(wallet_id: str, new_balance: float) -> bool:
    db = get_db()
    result = await db.users.update_one(
        {"wallet_id": wallet_id},
        {"$set": {"balance": new_balance}},
        upsert=True
    )
    return result.modified_count > 0 or result.upserted_id is not None


async def sendMoney(from_wallet_id: str, to_wallet_id: str, amount: float) -> bool:
    db = get_db()
    async with await db.client.start_session() as session:
        async with session.start_transaction():
            from_user = await db.users.find_one({"wallet_id": from_wallet_id}, session=session)
            to_user = await db.users.find_one({"wallet_id": to_wallet_id}, session=session)

            if not from_user or not to_user:
                await session.abort_transaction()
                return False

            if from_user["balance"] < amount:
                await session.abort_transaction()
                return False

            new_from_balance = from_user["balance"] - amount
            new_to_balance = to_user["balance"] + amount

            from_result = await db.users.update_one(
                {"wallet_id": from_wallet_id},
                {"$set": {"balance": new_from_balance}},
                session=session
            )

            to_result = await db.users.update_one(
                {"wallet_id": to_wallet_id},
                {"$set": {"balance": new_to_balance}},
                session=session
            )

            if from_result.modified_count == 0 or to_result.modified_count == 0:
                await session.abort_transaction()
                return False


            tx_id = str(uuid.uuid4())
            timestamp = datetime.now(timezone.utc).isoformat()

            sender_tx = {
                "id": tx_id,
                "amount": -amount,
                "type": "sent",
                "to_wallet_id": to_wallet_id,
                "balance_after": new_from_balance,
                "created_at": timestamp
            }

            receiver_tx = {
                "id": tx_id,
                "amount": amount,
                "type": "received",
                "from_wallet_id": from_wallet_id,
                "balance_after": new_to_balance,
                "created_at": timestamp
            }

            await db.users.update_one(
                {"wallet_id": from_wallet_id},
                {"$push": {"transactions": {"$each": [sender_tx], "$position": 0}}},
                session=session,
                upsert=True
            )

            await db.users.update_one(
                {"wallet_id": to_wallet_id},
                {"$push": {"transactions": {"$each": [receiver_tx], "$position": 0}}},
                session=session,
                upsert=True
            )

    return True

async def transactionHistory(wallet_id: str) -> list | None:
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.update_one(
        {"wallet_id": wallet_id},
        {"$push": {"transactions": {"$each": [tx], "$position": 0}}},
        upsert=True
    )
    return result.modified_count > 0 or result.upserted_id is not None
