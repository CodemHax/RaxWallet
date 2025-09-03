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
        return db
    except:
          raise Exception("Database connection error.")



def get_db():
    if db is None:
        raise RuntimeError("Database not initialized.")
    return db


def get_client():
    return client

