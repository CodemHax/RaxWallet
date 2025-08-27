from pydantic import BaseModel, EmailStr, constr, validator, Field


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


class JWTtoken(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
