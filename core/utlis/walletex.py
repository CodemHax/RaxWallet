import random
import string


class WalletEx:

    @staticmethod
    async def walletIdGen(length: int) -> str:
        hashId = ''.join(random.choices(string.digits + string.ascii_lowercase, k=length))
        return hashId

