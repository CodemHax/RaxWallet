from fastapi import APIRouter, Request, HTTPException
from starlette.responses import JSONResponse

from core.utlis.jwt_gen import create_access_token
from core.database.user_db import RegisterUser, LoginUser
from core.models.models import RegisterManager, LoginManager, Token
from core.utlis.security import hash_password, check_password
from core.utlis.validation import validatePass
from core.utlis.limiter import limiter
from config import Config

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
@limiter.limit("5/minute")
async def login_user(request: Request, login: LoginManager):
    check_username = login.username.lower()
    user = await LoginUser(username=check_username)

    invalid_passError = HTTPException(status_code=401, detail="Invalid username or password")

    if not user:
        raise invalid_passError

    valid_password = await check_password(login.password, user.hashed_password)
    if not valid_password:
        raise invalid_passError

    jwt_token = create_access_token({"sub": user.username, "user_id": user.id})
    return Token(access_token=jwt_token, token_type="bearer" ,  expires_in=Config.ACCESS_TOKEN_EXPIRE_MINUTES * 60)


@router.post("/register")
@limiter.limit("5/minute")
async def register_user(request: Request, register: RegisterManager):
    valid, details = await validatePass(register.password)
    if not valid:
        raise HTTPException(status_code=400, detail=details["message"])

    hashed_password = await hash_password(register.password)
    result = await RegisterUser(
        phoneNumber=register.phoneNumber,
        username=register.username.lower(),
        hashed_password=hashed_password,
        email=register.email.lower(),
        full_name=register.full_name.lower()
    )

    if result is True:
        return JSONResponse({"status": "success", "message": "User registered successfully"}, status_code=201)
    elif result == "email":
        return JSONResponse({"status": "error", "message": "Email already exists"}, status_code=409)
    elif result == "username":
        return JSONResponse({"status": "error", "message": "Username already exists"}, status_code=409)
    elif result == "phoneNumber":
        return JSONResponse({"status": "error", "message": "Phone number already exists"}, status_code=409)
    else:
        return JSONResponse({"status": "error", "message": "Duplicate entry or unknown error"}, status_code=409)
