from datetime import datetime, timezone
from pymongo.errors import DuplicateKeyError
from core.database.db import get_db
from core.utlis.validation import validate_wallet_id, validate_request_id, validate_amount
from core.utlis.error import ValidationError , TransactionRequestedError

async def transactionRequest(req_id: str, recipient_id: str, recipient_username: str, amount: str, status: str, sender_wallet_id: str = None, sender_username: str = None) -> bool | str:
      try:
          db = get_db()
          if validate_request_id(req_id) is None:
              raise ValidationError("Request ID is required")
          if validate_wallet_id(recipient_id) is None:
              raise ValidationError("Wallet ID is required")
          if not validate_amount(amount):
              raise ValidationError(validate_amount(amount)[1]["message"])
          if status is None or status.strip() == "":
              raise ValidationError("Status is required")

          existing_req = await findTransactionRequests(req_id, recipient_id)

          if existing_req:
              return True

          tx_request = {
              "request_id": req_id,
              "recipient_id": recipient_id,
              "recipient_username": recipient_username,
              "sender_wallet_id": sender_wallet_id or "",
              "sender_username": sender_username or "",
              "amount": amount,
              "status": status.lower(),
              "created_at": datetime.now(timezone.utc).isoformat(),
              "updated_at": datetime.now(timezone.utc).isoformat()
          }

          await isInDB(recipient_id)

          result = await db.transactionsreq.update_one(
              {"wallet_id": recipient_id},
                 {
                  "$push":
                      {"transaction_requests":
                          {
                            "$each": [tx_request],
                            "$position": 0
                         }
                      }
                  },
              upsert=True
              )
          return result.modified_count > 0 or result.upserted_id is not None
      except ValidationError as e:
          raise ValidationError(e)

      except Exception as e:
          raise TransactionRequestedError(e)

async def filterTransactionRequests(wallet_id: str, status: str = None, date: str = None) -> list | None:
    try:
        db = get_db()
        if validate_wallet_id(wallet_id) is None:
            raise ValidationError("Wallet ID is required")
        query = {"wallet_id": wallet_id}
        if status is not None and status.strip() != "":
            query["transaction_requests.status"] = status.lower()
        if date is not None and date.strip() != "":
            query["transaction_requests.created_at"] = date
        user_doc = await db.transactionsreq.find_one(query)
        if not user_doc or "transaction_requests" not in user_doc:
            return []
        requests = user_doc["transaction_requests"]
        if status:
            requests = [req for req in requests if req.get("status") == status.lower()]
        if date:
            requests = [req for req in requests if req.get("created_at") == date]
        return requests
    except ValidationError as e:
        raise ValidationError(e)
    except Exception as e:
        raise TransactionRequestedError(e)




async def findTransactionRequests(request_id: str, wallet_id: str = None) -> dict | None:

      try:
          db = get_db()
          if validate_request_id(request_id) is None:
              raise ValidationError("Request ID is required")
          if not request_id or not request_id.strip():
              return None

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
      except ValidationError as e:
          raise ValidationError(e)

      except Exception as e:
          raise TransactionRequestedError(e)



async def updateTransactionRequest(request_id: str, wallet_id: str, status: str, sender_wallet_id: str = None, sender_username: str = None) -> bool:
    try:
        db = get_db()
        if validate_request_id(request_id) is None:
            return False
        if validate_wallet_id(wallet_id) is None:
            return False
        if not validate_amount(status):
            return False
        if not request_id or not request_id.strip():
            return False
        if not status or not status.strip():
            return False
        valid_statuses = ["pending", "approved", "rejected", "completed", "cancelled"]

        if status.lower() not in valid_statuses:
           raise ValidationError(f"Status must be one of: {', '.join(valid_statuses)}")

        if wallet_id and wallet_id.strip():
           req_doc = await findTransactionRequests(request_id, wallet_id)
           if not req_doc:
              return False
           wallet_id = req_doc["recipient_id"]
        current_req_doc = await findTransactionRequests(request_id, wallet_id)
        if not current_req_doc:
           return False

        if current_req_doc["status"] == status.lower():
            return True

        update_fields = {
        "transaction_requests.$.status": status.lower(),
        "transaction_requests.$.updated_at": datetime.now(timezone.utc).isoformat()}

        if sender_wallet_id:
           update_fields["transaction_requests.$.sender_wallet_id"] = sender_wallet_id
        if sender_username:
           update_fields["transaction_requests.$.sender_username"] = sender_username

        result = await db.transactionsreq.update_one({"wallet_id": wallet_id , "transaction_requests.request_id": request_id}, {"$set": update_fields}, upsert=True)
        return result.modified_count > 0 or result.upserted_id is not None
    except ValidationError as e:
        raise ValidationError(e)

    except Exception as e:
        raise TransactionRequestedError(e)


async def createTransaction(wallet_id: str) -> bool:
      try:
          db = get_db()
          if not wallet_id:
              return False
          doc = {
              "wallet_id": wallet_id,
              "transaction_requests": [],
              "created_at": datetime.now(timezone.utc).isoformat(),
              "updated_at": datetime.now(timezone.utc).isoformat()
          }
          result = await db.transactionsreq.insert_one(doc)
          return bool(result.inserted_id)
      except DuplicateKeyError:
              return True
      except ValidationError as e:
          raise ValidationError(e)
      except Exception:
          raise TransactionRequestedError




async def isInDB(wallet_id: str) -> bool:
     try:
         db = get_db()
         if validate_wallet_id(wallet_id) is None:
             raise ValidationError("Wallet ID is required")

         user_doc = await db.transactionsreq.find_one({"wallet_id": wallet_id})
         if  user_doc:
             return True
         return await createTransaction(wallet_id)

     except ValidationError as e:
         raise ValidationError(e)
     except Exception:
         raise TransactionRequestedError



async def getRequests(wallet_id: str , limit: int = 100) -> list:
    try:
        db = get_db()
        if validate_wallet_id(wallet_id) is None:
            raise ValidationError("Wallet ID is required")
        if limit is None or limit < 0:
            raise ValidationError("Limit must be a positive integer")
        if limit < 0 or  limit > 1000:
            limit = 100
        user_doc = await db.transactionsreq.find_one({"wallet_id": wallet_id}, {"transaction_requests.$": 1})
        if not user_doc or "transaction_requests" not in user_doc:
            return []
        return user_doc["transaction_requests"][:limit]
    except ValidationError as e:
        raise ValidationError(e)
    except Exception :
        raise TransactionRequestedError

async def deleteTransactionRequest(request_id: str, wallet_id: str) -> bool:
    try:
        db = get_db()
        if validate_request_id(request_id) is None:
            raise ValidationError("Request ID is required")
        if not wallet_id or not wallet_id.strip():
            raise ValidationError("Wallet ID is required")

        existing_request = await findTransactionRequests(request_id, wallet_id)
        if not existing_request:
            return True

        result = await db.transactionsreq.update_one(
            {"wallet_id": wallet_id},
            {"$pull":
                 {"transaction_requests":
                      {"request_id": request_id}}
            },
            upsert=True
        )

        success = result.modified_count > 0 or result.upserted_id is not None
        return success

    except ValidationError as e:
        raise ValidationError(e)
    except Exception:
        raise TransactionRequestedError
