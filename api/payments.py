from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse, RedirectResponse
from typing import Annotated
import qrcode
import io
import uuid
from core.database.reqs_db import findTransactionRequests, updateTransactionRequest, transactionRequest
from core.database.transaction_db import GetUserByWalletId, UpdateUserBalanceByWalletId, addTransaction
from core.models.models import UserInDB, QRPaymentRequest, QRPaymentResponse, PaymentConfirmationData, PaymentAction
from datetime import datetime, timedelta, timezone
from utlis.getCurrUser import getUser

pay_router = APIRouter(prefix="/payments", tags=["payments"])


@pay_router.post("/create_qr_request")
async def createQRPaymentRequest(request: Request, qr_request: QRPaymentRequest,
                                 curr: Annotated[UserInDB, Depends(getUser)]):
    if qr_request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    request_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=qr_request.expires_in_minutes)

    try:
        data = await transactionRequest(
            req_id=request_id,
            recipient_id=curr.wallet_id,
            recipient_username=curr.full_name,
            amount=str(qr_request.amount),
            status="pending",
            sender_wallet_id="",
            sender_username=""
        )

        if not data:
            raise HTTPException(status_code=500, detail="Failed to create payment request")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    qr_code_url = f"http://{request.url.netloc}/payments/qr_code/{request_id}"

    return QRPaymentResponse(
        request_id=request_id,
        qr_code_url=qr_code_url,
        amount=qr_request.amount,
        receiver_name=curr.full_name,
        expires_at=expires_at.isoformat()
    )


@pay_router.get("/qr_code/{request_id}")
async def getQRCode(request: Request, request_id: str):
    try:
        req = await findTransactionRequests(request_id=request_id, wallet_id="")
        if req is None:
            raise HTTPException(status_code=404, detail="Payment request not found")

        if req.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Payment request is no longer active")

        payment_url = f"http://{request.url.netloc}/payments/scan?request_id={request_id}"
        img = qrcode.make(payment_url)
        buf = io.BytesIO()
        img.save(buf, "PNG")
        buf.seek(0)

        return StreamingResponse(buf, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate QR code: {str(e)}")


@pay_router.get("/scan")
async def handleQRScan(request: Request, request_id: str):
    return RedirectResponse(url=f"/payment-confirmation?request_id={request_id}")


@pay_router.get("/confirmation_data/{request_id}")
async def getPaymentConfirmationData(request_id: str, curr: Annotated[UserInDB, Depends(getUser)]):
    if not request_id:
        raise HTTPException(status_code=400, detail="Missing request_id")

    req = await findTransactionRequests(request_id=request_id, wallet_id="")
    if req is None:
        raise HTTPException(status_code=404, detail="Payment request not found")

    if req.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Payment request is no longer active")

    amount = float(req["amount"])
    if curr.balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient funds in your wallet")

    return PaymentConfirmationData(
        request_id=request_id,
        receiver_name=req.get("recipient_username", "Unknown"),
        receiver_wallet_id=req.get("recipient_id"),
        amount=amount,
        description=req.get("description", ""),
        transaction_id=request_id
    )


@pay_router.post("/process_action")
async def processPaymentAction(action: PaymentAction, curr: Annotated[UserInDB, Depends(getUser)]):
    if not action.request_id:
        raise HTTPException(status_code=400, detail="Missing request_id")

    if action.action not in ["accept", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'")

    req = await findTransactionRequests(request_id=action.request_id, wallet_id="")
    if req is None:
        raise HTTPException(status_code=404, detail="Payment request not found")

    if req.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Payment request is no longer active")

    if action.action == "reject":
        await updateTransactionRequest(
            request_id=action.request_id,
            wallet_id=req["recipient_id"],
            status="rejected",
            sender_wallet_id=curr.wallet_id,
            sender_username=curr.username
        )
        return JSONResponse({
            "status": "success",
            "message": "Payment request rejected",
            "action": "rejected"
        })

    amount = float(req["amount"])

    if curr.balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient funds in your wallet")

    receiver = await GetUserByWalletId(req.get("recipient_id"))
    if receiver is None:
        raise HTTPException(status_code=404, detail="Receiver wallet not found")

    try:
        new_sender_balance = curr.balance - amount
        new_receiver_balance = receiver.balance + amount

        success_sender = await UpdateUserBalanceByWalletId(curr.wallet_id, new_sender_balance)
        success_receiver = await UpdateUserBalanceByWalletId(receiver.wallet_id, new_receiver_balance)

        if not success_sender or not success_receiver:
            raise HTTPException(status_code=500, detail="Failed to complete transaction")

        await addTransaction(curr.wallet_id, -amount, "debit", new_sender_balance)
        await addTransaction(receiver.wallet_id, amount, "credit", new_receiver_balance)

        await updateTransactionRequest(
            request_id=action.request_id,
            wallet_id=req["recipient_id"],
            status="completed",
            sender_wallet_id=curr.wallet_id,
            sender_username=curr.username
        )

        return JSONResponse({
            "status": "success",
            "message": "Payment processed successfully",
            "action": "accepted",
            "amount": amount,
            "receiver_name": receiver.full_name,
            "new_balance": new_sender_balance
        })

    except Exception as e:
        await updateTransactionRequest(
            request_id=action.request_id,
            wallet_id=req["recipient_id"],
            status="failed"
        )
        raise HTTPException(status_code=500, detail=f"Failed to process payment: {str(e)}")


@pay_router.get("/request_status/{request_id}")
async def getRequestStatus(request_id: str):
    req = await findTransactionRequests(request_id=request_id, wallet_id="")
    if req is None:
        raise HTTPException(status_code=404, detail="Payment request not found")

    return JSONResponse({
        "request_id": request_id,
        "status": req.get("status"),
        "amount": float(req.get("amount", 0)),
        "receiver_name": req.get("recipient_username"),
        "sender_name": req.get("sender_username", ""),
        "created_at": req.get("created_at")
    })


@pay_router.delete("/cancel_request/{request_id}")
async def cancelPaymentRequest(request_id: str, curr: Annotated[UserInDB, Depends(getUser)]):
    req = await findTransactionRequests(request_id=request_id, wallet_id=curr.wallet_id)
    if req is None:
        raise HTTPException(status_code=404, detail="Payment request not found or you're not authorized")

    if req.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Can only cancel pending requests")

    await updateTransactionRequest(
        request_id=request_id,
        wallet_id=curr.wallet_id,
        status="cancelled"
    )

    return JSONResponse({
        "status": "success",
        "message": "Payment request cancelled"
    })
