# RaxWallet - Digital Wallet API

A FastAPI-based digital wallet system with user authentication, rate limiting, QR payments, and MongoDB integration.

## 📋 Development Task List & Progress

### ✅ Completed Features

#### **August 26, 2025**
- [x] **Project Setup**
  - FastAPI application structure
  - MongoDB integration with Motor (async driver)
  - Environment configuration with dotenv
  - Virtual environment setup

- [x] **Authentication System**
  - User registration endpoint (`/auth/register`)
  - User login endpoint (`/auth/login`)
  - JWT token generation and validation
  - Password hashing with bcrypt
  - Password validation with security requirements

- [x] **Database Layer**
  - MongoDB async connection setup
  - User database operations (CRUD)
  - Transaction database operations
  - Payment request database operations
  - Database indexing for users
  - Connection lifecycle management

- [x] **Security & Rate Limiting**
  - Rate limiting with SlowAPI (5 requests/minute)
  - Input validation with Pydantic
  - Secure password hashing
  - JWT token security

- [x] **API Structure**
  - Modular router organization
  - Error handling and JSON responses
  - Request/Response models
  - Database connection management

- [x] **User Profile Management**
  - User profile endpoint (`/users/me`)
  - Current user retrieval functionality
  - Protected user routes with JWT validation

- [x] **Wallet Infrastructure**
  - Wallet ID generation utility (WalletEx)
  - Random wallet ID creation with customizable length
  - Alphanumeric wallet identifier system

#### **August 27, 2025**
- [x] **Wallet Operations (Complete)**
  - [x] Wallet balance endpoint (`/wallet/balance`)
  - [x] Add funds endpoint (`/wallet/add_funds/{amount}`)
  - [x] Withdraw funds endpoint (`/wallet/withdraw_funds/{amount}`)
  - [x] Send money peer transfer endpoint (`/wallet/send_money/{to_wallet_id}/{amount}`)
  - [x] Transaction history endpoint (`/wallet/transactions`)
  - [x] Wallet profile summary endpoint (`/wallet/profile`)
  - [x] Transaction recording (credit/debit with running balance)
  - [x] Balance validation & error handling

#### **September 1, 2025**
- [x] **Payment System & QR Payments (Core)**
  - [x] QR payment request creation (`/payments/create_qr_request`)
  - [x] QR code generation endpoint (`/payments/qr_code/{request_id}`)
  - [x] QR payment scanning handling (`/payments/scan`)
  - [x] Payment confirmation data retrieval (`/payments/confirmation_data/{request_id}`)
  - [x] Payment processing foundation (request lifecycle, validation)
  - [x] Expirable payment requests with UUID generation

#### **September 3, 2025**
- [x] **Payment Request Management Enhancements**
  - [x] Accept / Reject payment request (`POST /payments/process_action`)
  - [x] Payment request status lookup (`GET /payments/request_status/{request_id}`)
  - [x] List my incoming/outgoing requests (`GET /payments/my-requests`)
  - [x] Manually expire pending request (`POST /payments/expire_request/{request_id}`)
  - [x] Cancel own pending request (`DELETE /payments/cancel_request/{request_id}`)
  - [x] Status transitions added: pending → (completed | rejected | cancelled | expired | failed)
  - [x] Atomic balance updates with transaction logging for accepted requests

-
### 📝 Planned Features

#### **Next Sprint**
- [ ] **Transaction System Enhancements**
  - [ ] Transaction pagination & filtering
  - [ ] Transaction fees calculation
  - [ ] Transaction limits and controls
  - [ ] Duplicate transaction prevention

- [ ] **User Management Enhancements**
  - [ ] Password reset functionality
  - [ ] Email verification
  - [ ] Account status management

- [ ] **Payment System Enhancements**
  - [ ] Payment notifications
  - [ ] Scheduled / recurring payments
  - [ ] Multi-currency support

#### **Future Enhancements**
- [ ] **Advanced Features**
  - [ ] Admin dashboard with analytics
  - [ ] Bulk operations support
  - [ ] Advanced reporting and analytics

- [ ] **Security Improvements**
  - [ ] Two-factor authentication (2FA)
  - [ ] Device management and tracking
  - [ ] Session management
  - [ ] Fraud detection algorithms

- [ ] **API Enhancements**
  - [ ] Comprehensive API documentation with OpenAPI
  - [ ] Webhook support for external integrations
  - [ ] Rate limiting per user/account
  - [ ] Advanced filtering and search capabilities

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python 3.11+)
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT tokens with python-jose
- **Security**: Passlib for password hashing
- **Rate Limiting**: SlowAPI
- **Validation**: Pydantic with email validation
- **Environment**: python-dotenv
- **QR Codes**: python-qrcode library


## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd RaxWallet
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   # or
   source .venv/bin/activate  # Linux/Mac
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**
   Create a `.env` file with:
   ```env
   MONGO_URL=mongodb://localhost:27017
   MONGO_DBNAME=raxwallet
   API_SECRET_KEY=your-secret-key-here
   ```

5. **Run the application**
   ```bash
   python main.py
   ```

## 🔧 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login

### User Management
- `GET /users/me` - Get current user profile

### Wallet Operations
- `GET /wallet/balance` - Get current wallet balance
- `POST /wallet/add_funds/{amount}` - Credit funds to wallet
- `POST /wallet/withdraw_funds/{amount}` - Withdraw funds from wallet
- `POST /wallet/send_money/{to_wallet_id}/{amount}` - Transfer funds to another wallet
- `GET /wallet/transactions` - List wallet transaction history
- `GET /wallet/profile` - Get wallet + user profile summary

### Payment System
- `POST /payments/create_qr_request` - Create QR payment request
- `GET /payments/qr_code/{request_id}` - Generate QR code for payment
- `GET /payments/scan` - Handle QR code scanning (redirects to confirmation UI)
- `GET /payments/confirmation_data/{request_id}` - Get payment confirmation data before approving
- `POST /payments/process_action` - Accept or reject a pending request
- `GET /payments/request_status/{request_id}` - Get current status for a payment request
- `GET /payments/my-requests` - List all requests related to the authenticated wallet
- `POST /payments/expire_request/{request_id}` - Manually expire own pending request
- `DELETE /payments/cancel_request/{request_id}` - Cancel own pending request (originator)

Status lifecycle: pending → (completed | rejected | cancelled | expired | failed)

### Rate Limits
- Authentication endpoints: 5 requests per minute per IP
- Wallet balance/transactions: 10 requests per minute per IP
- Mutating wallet operations (add, withdraw, send): 5 requests per minute per IP
- Create QR payment requests: 10 requests per minute per IP

## 📊 Daily Development Log

### September 3, 2025
**Enhancements:**
- Added full payment request management lifecycle (accept / reject / cancel / expire)
- Added request status retrieval + user-centric listing endpoint
- Implemented safe status transitions with failure handling
- Ensured atomic balance updates and transaction logging on acceptance

### September 1, 2025
**Current Status:**
- Complete wallet operations system implemented
- QR payment system with expirable requests
- Frontend interface for wallet management
- Transaction history and profile management
- Rate limiting and security measures in place

**System Features:**
- Full CRUD operations for wallets
- QR code generation for payments
- Real-time balance updates
- Transaction logging with running balances
- Secure JWT authentication

### August 27, 2025
**Implemented:**
- Core wallet operations (balance, add funds, withdraw, send money)
- Transaction persistence & retrieval
- Wallet profile aggregation endpoint
- Basic validation (amount > 0, sufficient funds)
- Rate limiting applied to wallet routes

### August 26, 2025
**Implemented:**
- Fixed a critical bug in the rate limiter exception handler
- Resolved AttributeError by moving limiter to `app.state.limiter`
- Improved error handling for rate limit exceeded scenarios

---

## 📝 Development Notes

### Current System Capabilities
- Complete digital wallet functionality
- QR-based payment system with managed request lifecycle
- Transaction history tracking
- User authentication and authorization
- Rate limiting for API protection

### Performance Considerations
- MongoDB indexes created for efficient user lookups
- Async operations throughout the application
- Connection pooling with Motor driver
- Optimized transaction processing

### Security Notes
- All passwords are hashed using bcrypt
- JWT tokens for stateless authentication
- Rate limiting prevents abuse
- Input validation on all endpoints
- Secure QR payment request handling with controlled state transitions

---

**Last Updated**: September 3, 2025
**Version**: 0.7.0
**Status**: In Active Development
