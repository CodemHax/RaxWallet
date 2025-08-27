from fastapi import APIRouter, Depends, HTTPException ,Request
from typing import Annotated
from starlette.responses import JSONResponse
from core.models.models import UserInDB
from utlis.getCurrUser import getUser
from core.database.user_db import GetUserByWalletId, addTransaction, transactionHistory, UpdateUserBalanceByWalletId, GetUserDocByWalletId
from utlis.walletex import WalletEx
from utlis.limiter import limiter




wallet_router = APIRouter(prefix="/wallet", tags=["wallet"])
walletex = WalletEx()


@wallet_router.get("/balance")
@limiter.limit("10/minute")
async def get_balance(request: Request,curr: Annotated[UserInDB, Depends(getUser)]):
    user = await GetUserByWalletId(curr.wallet_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return JSONResponse({"wallet_id": user.wallet_id, "balance": user.balance}, status_code=200)


@wallet_router.post("/add_funds/{amount}")
@limiter.limit("5/minute")
async def add_funds(request: Request, amount: float, curr: Annotated[UserInDB, Depends(getUser)]):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")
    user = await GetUserByWalletId(curr.wallet_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    new_balance = user.balance + amount
    success = await UpdateUserBalanceByWalletId(user.wallet_id, new_balance)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update balance")
    await addTransaction(user.wallet_id, amount, "credit", new_balance)
    return JSONResponse({"wallet_id": user.wallet_id, "new_balance": new_balance}, status_code=200)


@wallet_router.post("/withdraw_funds/{amount}")
@limiter.limit("5/minute")
async def withdraw_funds(request: Request, amount: float, curr: Annotated[UserInDB, Depends(getUser)]):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")
    user = await GetUserByWalletId(curr.wallet_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
    new_balance = user.balance - amount
    success = await UpdateUserBalanceByWalletId(user.wallet_id, new_balance)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update balance")
    await addTransaction(user.wallet_id, -amount, "debit", new_balance)
    return JSONResponse({"wallet_id": user.wallet_id, "new_balance": new_balance}, status_code=200)


@wallet_router.post("/send_money/{to_wallet_id}/{amount}")
@limiter.limit("5/minute")
async def send_money(request: Request, to_wallet_id: str, amount: float, curr: Annotated[UserInDB, Depends(getUser)]):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")
    from_user = await GetUserByWalletId(curr.wallet_id)
    to_user = await GetUserByWalletId(to_wallet_id)
    if not to_user:
        raise HTTPException(status_code=404, detail="Recipient wallet not found")
    if from_user.balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
    new_from_balance = from_user.balance - amount
    new_to_balance = to_user.balance + amount
    success_from = await UpdateUserBalanceByWalletId(from_user.wallet_id, new_from_balance)
    success_to = await UpdateUserBalanceByWalletId(to_user.wallet_id, new_to_balance)
    if not success_from or not success_to:
        raise HTTPException(status_code=500, detail="Failed to complete transaction")
    await addTransaction(from_user.wallet_id, -amount, "debit", new_from_balance)
    await addTransaction(to_user.wallet_id, amount, "credit", new_to_balance)
    return JSONResponse({
        "from_wallet_id": from_user.wallet_id,
        "new_from_balance": new_from_balance,
        "to_wallet_id": to_user.wallet_id,
        "new_to_balance": new_to_balance
    }, status_code=200)



@wallet_router.get("/transactions")
@limiter.limit("10/minute")
async def transaction_history(request: Request, curr: Annotated[UserInDB, Depends(getUser)]):
    txs = await transactionHistory(curr.wallet_id)
    if txs is None or len(txs) == 0:
        return JSONResponse({"wallet_id": curr.wallet_id, "transactions": []}, status_code=200)
    return JSONResponse({"wallet_id": curr.wallet_id, "transactions": txs}, status_code=200)



@wallet_router.get("/profile")
async def get_profile(request: Request, curr: Annotated[UserInDB, Depends(getUser)]):
    doc = await GetUserDocByWalletId(curr.wallet_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="User not found")
    txs = doc["transactions"] if "transactions" in doc else []
    profile_data = {
        "username": doc["username"],
        "email": doc["email"],
        "full_name": doc["full_name"],
        "phoneNumber": doc["phoneNumber"],
        "wallet_id": doc["wallet_id"],
        "balance": doc["balance"] or 0.0,
        "transactions_count": len(txs),
        "recent_transactions": txs[:10]
    }
    return JSONResponse({"profile": profile_data}, status_code=200)
