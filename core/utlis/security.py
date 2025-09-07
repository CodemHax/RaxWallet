from passlib.context import CryptContext

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def hash_password(password: str) -> str:
    return password_context.hash(password)


async def check_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return password_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(e)
        return False


