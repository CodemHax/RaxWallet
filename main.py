from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from api.auth import router as auth_router
from api.payments import pay_router
from api.users import user_router
from api.wallet import wallet_router
from core.database.db import initDB, get_client
from core.database.user_db import create_indexes
from core.utlis.limiter import limiter

@asynccontextmanager
async def lifespan(app: FastAPI):
    await initDB()
    await create_indexes()
    yield
    client = get_client()
    if client is not None:
        client.close()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(wallet_router)
app.include_router(pay_router)


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/")
async def root_page():
    return FileResponse("static/index.html")

@app.get("/features")
async def features_page():
    return FileResponse("static/features.html")

@app.get("/login")
async def login_page():
    return FileResponse("static/login.html")

@app.get("/register")
async def register_page():
    return FileResponse("static/register.html")

@app.get("/dashboard")
async def dashboard_page():
    return FileResponse("static/dashboard.html")

@app.get("/profile")
async def profile_page():
    return FileResponse("static/profile.html")

@app.get("/payment-confirmation")
async def payment_confirmation_page():
    return FileResponse("static/payment-confirmation.html")

@app.get("/qr-payment-generator")
async def qr_payment_generator_page():
    return FileResponse("static/qr-payment-generator.html")

@app.get("/payment-received")
async def payment_received_page():
    return FileResponse("static/payment-received.html")


if __name__ == "__main__":
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
