class Error(Exception):
    pass

class ValidationError(Error):
    pass

class TransactionError(Error):
    pass

class TransactionNotFoundError(TransactionError):
    pass

class TransactionAlreadyInPool(TransactionError):
    pass

class TransactionRequestedError(TransactionError):
    pass

