from fastapi import APIRouter , Depends
from typing import Annotated

from core.models.models import UserInDB
from core.utlis.getCurrUser import getUser

user_router = APIRouter(prefix="/users" , tags=["users"])



@user_router.get("/me")
async def get_me(curr: Annotated[UserInDB, Depends(getUser)]):
    return curr