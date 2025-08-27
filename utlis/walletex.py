import random
import string


class WalletEx:

    async def walletIdGen(self, length: int) -> str:
        hashId = ''.join(random.choices(string.digits + string.ascii_lowercase, k=length))
        return hashId

