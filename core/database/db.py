from motor.motor_asyncio import AsyncIOMotorClient
from config import Config

client = None
db = None


async def initDB():
    global client, db
    try:
        Config.validate()
        client = AsyncIOMotorClient(Config.mongo_uri, )
        db = client[Config.mongo_db]
        await db.users.create_index("email", unique=True)
        await db.users.create_index("username", unique=True)
        await db.users.create_index("phoneNumber", unique=True)
        return db
    except:
        raise


def get_db():
    if db is None:
        raise RuntimeError("Database not initialized.")
    return db


def get_client():
    return client
