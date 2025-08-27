import os
from dotenv import  load_dotenv

load_dotenv()

class Config:
    mongo_uri = os.getenv("MONGO_URL") or ""
    mongo_db = os.getenv("MONGO_DBNAME") or ""
    secret_key = os.getenv("API_SECRET_KEY") or ""
    ALGORITHM = os.getenv("ALGORITHM") or ""
    ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES") or ""

    @staticmethod
    def validate():
        missing = []
        if not Config.mongo_uri:
            missing.append("MONGO_URI (or MONGO_URL)")
        if not Config.mongo_db:
            missing.append("MONGO_DB (or MONGO_DBNAME)")
        if not Config.secret_key:
            missing.append("API_SECRET_KEY")
        if missing:
            raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")
