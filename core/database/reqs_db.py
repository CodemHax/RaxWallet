from datetime import datetime, timezone
from pymongo.errors import DuplicateKeyError
from core.database.db import get_db


async def transactionRequest(req_id: str, recipient_id: str, recipient_username: str, amount: str, status: str, sender_wallet_id: str = None, sender_username: str = None) -> bool:
    db = get_db()

    tx_request = {
        "request_id": req_id,
        "recipient_id": recipient_id,
        "recipient_username": recipient_username,
        "sender_wallet_id": sender_wallet_id or "",
        "sender_username": sender_username or "",
        "amount": amount,
        "status": status,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await isInDB(recipient_id)

    result = await db.transactionsreq.update_one(
        {"wallet_id": recipient_id},
        {"$push": {"transaction_requests": {"$each": [tx_request], "$position": 0}}}
    )
    return result.modified_count > 0


async def findTransactionRequests(request_id: str, wallet_id: str = None) -> dict | None:
    db = get_db()

    if wallet_id and wallet_id.strip():
        user_doc = await db.transactionsreq.find_one(
            {"wallet_id": wallet_id, "transaction_requests.request_id": request_id},
            {"transaction_requests.$": 1}
        )
        if user_doc and "transaction_requests" in user_doc:
            return user_doc["transaction_requests"][0]
    else:
        user_doc = await db.transactionsreq.find_one(
            {"transaction_requests.request_id": request_id},
            {"transaction_requests.$": 1}
        )
        if user_doc and "transaction_requests" in user_doc:
            return user_doc["transaction_requests"][0]

    return None


async def updateTransactionRequest(request_id: str, wallet_id: str, status: str, sender_wallet_id: str = None, sender_username: str = None) -> bool:
    db = get_db()

    if not wallet_id or not wallet_id.strip():
        request_doc = await findTransactionRequests(request_id)
        if not request_doc:
            return False
        wallet_id = request_doc.get("recipient_id")

    update_fields = {"transaction_requests.$.status": status}

    if sender_wallet_id:
        update_fields["transaction_requests.$.sender_wallet_id"] = sender_wallet_id
    if sender_username:
        update_fields["transaction_requests.$.sender_username"] = sender_username

    result = await db.transactionsreq.update_one(
        {"wallet_id": wallet_id, "transaction_requests.request_id": request_id},
        {"$set": update_fields}
    )
    return result.modified_count > 0


async def createTransaction(wallet_id: str) -> bool:
    db = get_db()
    doc = {
        "wallet_id": wallet_id,
        "transaction_requests": []
    }
    try:
        result = await db.transactionsreq.insert_one(doc)
        return bool(result.inserted_id)
    except DuplicateKeyError:
        return False


async def isInDB(wallet_id: str) -> bool:
    db = get_db()
    existing_doc = await db.transactionsreq.find_one({"wallet_id": wallet_id})
    if not existing_doc:
        return await createTransaction(wallet_id)
    return True


async def getRequests(wallet_id: str) -> list:
    db = get_db()
    user_doc = await db.transactionsreq.find_one({"wallet_id": wallet_id})
    if not user_doc or "transaction_requests" not in user_doc:
        return []

    return user_doc["transaction_requests"]


async def deleteTransactionRequest(request_id: str, wallet_id: str) -> bool:
    db = get_db()
    result = await db.transactionsreq.update_one(
        {"wallet_id": wallet_id},
        {"$pull": {"transaction_requests": {"request_id": request_id}}}
    )
    return result.modified_count > 0
