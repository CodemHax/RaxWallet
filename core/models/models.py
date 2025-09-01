from pydantic import BaseModel, constr, Field


class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int


class UserInDB(BaseModel):
    id: str = Field(alias="_id")
    wallet_id: str
    username: str
    email: str
    full_name: str
    hashed_password: str
    phoneNumber: str
    balance: float = 0.0

class LoginManager(BaseModel):
    username: constr(min_length=5,max_length=30)
    password: constr(min_length=5,max_length=100)


class RegisterManager(BaseModel):
    phoneNumber: constr(min_length=10,max_length=13)
    username: constr(min_length=5,max_length=30)
    password: constr(min_length=5,max_length=100)
    email: constr(min_length=5,max_length=30)
    full_name: constr(min_length=5,max_length=30)


class JWToken(BaseModel):
    access_token: str
    token_type: str
    expires_in: int


class PaymentRequest(BaseModel):
    to_wallet_id: str
    amount: float

class PaymentResponse(BaseModel):
    transaction_id: str

class PaymentApprovalRequest(BaseModel):
    amount: float
    recipient_wallet_id: str
    message: str = ""

class QRCodeRequest(BaseModel):
    amount: float
    description: str = ""
    expires_in_minutes: int = 60

class QRCodeResponse(BaseModel):
    request_id: str
    qr_url: str
    payment_url: str
    expires_at: str

class QRPaymentRequest(BaseModel):
    amount: float
    description: str = ""
    expires_in_minutes: int = 60

class QRPaymentResponse(BaseModel):
    request_id: str
    qr_code_url: str
    amount: float
    receiver_name: str
    expires_at: str

class PaymentConfirmationData(BaseModel):
    request_id: str
    receiver_name: str
    receiver_wallet_id: str
    amount: float
    description: str
    transaction_id: str

class PaymentAction(BaseModel):
    request_id: str
    action: str

class PaymentRequestDetails(BaseModel):
    request_id: str
    sender_wallet_id: str
    sender_username: str
    recipient_id: str
    recipient_username: str
    amount: float
    status: str
    description: str = ""
    created_at: str = None

class ApprovalAction(BaseModel):
    request_id: str
    action: str
