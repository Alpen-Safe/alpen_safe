# Alpen Safe - Bitcoin Multi-Signature Wallet Service

## Overview

Alpen Safe is a sophisticated Bitcoin multi-signature wallet management service built with Node.js and TypeScript. It provides secure 2-of-3 multi-signature wallet creation, transaction management, and real-time Bitcoin blockchain monitoring with a robust architecture designed for production Bitcoin applications.

**Roadmap**: The service is designed with extensibility in mind and will support:
- 3-of-5 multi-signature wallets and general m-of-n wallet configurations
- Additional blockchain networks beyond Bitcoin in future releases

## Architecture

### Core Components

The application follows a layered architecture pattern:

```
├── Controllers     # HTTP request handlers and validation
├── Models         # Business logic and data models
├── API Layer      # External service integrations
├── Database       # Supabase PostgreSQL with type-safe schema
└── Monitoring     # Real-time blockchain monitoring
```

### Key Architecture Features

- **Multi-Signature Security**: Currently supports 2-of-3 multi-signature wallets where users control 2 keys and the server manages 1 key. Designed for future expansion to 3-of-5 and general m-of-n configurations
- **Real-time Monitoring**: ZMQ-based Bitcoin blockchain monitoring for instant transaction updates
- **Type-Safe Database**: Full TypeScript integration with Supabase PostgreSQL
- **Modular Design**: Clean separation of concerns with dependency injection for easy blockchain extensibility
- **Production Ready**: Docker containerization and comprehensive error handling

## Technology Stack

### Backend Technologies
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js with CORS support
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **Bitcoin Integration**: 
  - `bitcoinjs-lib` for Bitcoin operations
  - `bip32` for hierarchical deterministic wallets
  - `tiny-secp256k1` for elliptic curve cryptography
- **Blockchain Monitoring**: ZeroMQ (`zeromq`) for real-time Bitcoin node communication
- **External APIs**: Esplora API for blockchain data, CoinGecko for price feeds
- **Architecture**: Modular design supports future integration of additional blockchain networks

### Development & Testing
- **Testing**: Mocha with Chai assertions and Sinon for mocking
- **Code Quality**: ESLint with TypeScript rules and Prettier formatting
- **Build Tools**: TypeScript compiler with ts-node for development
- **Process Management**: Nodemon for development hot-reloading
- **Background Jobs**: `node-cron` for scheduled tasks

### Infrastructure
- **Authentication**: Supabase Auth with JWT tokens
- **Containerization**: Docker with Node.js 20 slim base image
- **Environment Management**: dotenv for configuration
- **Validation**: express-validator for request validation

## Core Features

### 1. Multi-Signature Wallet Management
- **2-of-3 Wallet Creation**: Users provide 2 extended public keys, server contributes 1
- **Future Support**: Planned support for 3-of-5 wallets and flexible m-of-n configurations
- **Hierarchical Deterministic (HD) Wallets**: BIP32-compliant key derivation
- **Address Generation**: Automatic receive and change address derivation
- **Wallet Descriptors**: Bitcoin Core compatible wallet descriptors
- **Blockchain Agnostic Design**: Architecture supports future expansion to other blockchain networks

### 2. Transaction Processing
- **PSBT (Partially Signed Bitcoin Transactions)**: Industry standard for multi-sig transactions
- **Partial Signature Collection**: Secure collection of signatures from multiple devices
- **Fee Estimation**: Configurable fee-per-byte transaction building
- **Broadcast Management**: Transaction broadcasting to Bitcoin network

### 3. Real-Time Blockchain Monitoring
- **ZMQ Integration**: Direct connection to Bitcoin Core ZMQ interface
- **Address Monitoring**: Automatic tracking of all wallet addresses
- **UTXO Management**: Real-time unspent transaction output tracking
- **Transaction Confirmation**: Block confirmation monitoring

### 4. Security Features
- **Role-Based Access Control**: Admin and viewer roles for wallet access
- **JWT Authentication**: Secure API access with Supabase Auth
- **Ledger Hardware Wallet Support**: Integration with Ledger device policies
- **Server-Side Key Management**: Secure server key derivation and storage

## API Endpoints

### Authentication
All API endpoints require JWT authentication via the `Authorization: Bearer <token>` header. Authentication is provided by Supabase user management system.

### User Endpoints (`/user`)

#### Wallet Management
- `POST /user/wallet/create/2-of-3` - Create a new 2-of-3 multi-signature wallet
  ```json
  {
    "walletName": "My Bitcoin Wallet",
    "userXPubs": [
      {
        "xpub": "xpub6C...",
        "path": "m/84'/0'/0'",
        "device": "ledger",
        "masterFingerprint": "a1b2c3d4",
        "label": "Hardware Wallet 1"
      },
      {
        "xpub": "xpub6D...",
        "path": "m/84'/0'/1'", 
        "device": "trezor",
        "masterFingerprint": "e5f6g7h8",
        "label": "Hardware Wallet 2"
      }
    ]
  }
  ```

**Future Endpoints**:
- `POST /user/wallet/create/3-of-5` - Create a new 3-of-5 multi-signature wallet
- `POST /user/wallet/create/m-of-n` - Create a custom m-of-n multi-signature wallet

### Wallet-Specific Endpoints (`/user/wallet/:walletId`)

#### Address Management
- `POST /user/wallet/:walletId/addresses/handout` - Get fresh addresses for receiving
  ```json
  {
    "isChange": false,
    "amount": 5
  }
  ```

#### Transaction Operations
- `POST /user/wallet/:walletId/tx/initiate` - Initiate a spending transaction
  ```json
  {
    "receivers": [
      {
        "address": "bc1q...",
        "value": 100000,
        "label": "Payment to Alice"
      }
    ],
    "feePerByte": 10
  }
  ```

- `POST /user/wallet/:walletId/tx/submit-partial-signatures` - Submit partial signatures
  ```json
  {
    "unsignedTransactionId": "uuid-here",
    "masterFingerprint": "a1b2c3d4",
    "partialSignatures": [
      {
        "signature": "30440220...",
        "inputIndex": 0,
        "pubkey": "03...",
        "tapleafHash": null
      }
    ]
  }
  ```

- `POST /user/wallet/:walletId/tx/broadcast` - Broadcast completed transaction
  ```json
  {
    "unsignedTransactionId": "uuid-here"
  }
  ```

#### Hardware Wallet Integration
- `POST /user/wallet/:walletId/ledger-policy` - Register Ledger wallet policy
  ```json
  {
    "masterFingerprint": "a1b2c3d4",
    "policyId": "abc123...",
    "policyHmac": "def456..."
  }
  ```

#### Wallet Scanning
- `POST /user/wallet/:walletId/scan` - Trigger wallet rescan for transactions

### Admin Endpoints (`/admin`)

**Note**: Admin endpoints are not exposed externally and are used internally for debugging purposes only. They will be removed in the production application.

All admin endpoints require an additional `X-Admin-Secret` header.

- `POST /admin/wallet/sign` - Sign transaction with server key
- `POST /admin/wallet/scan` - Admin-triggered wallet scan
- `POST /admin/wallet/build-psbt` - Build PSBT for transaction

## Database Schema

The application uses Supabase PostgreSQL with the following key tables:

### Core Tables
- **`multi_sig_wallets`**: Wallet metadata and descriptors
- **`addresses`**: Generated wallet addresses with derivation info
- **`utxos`**: Unspent transaction outputs tracking
- **`unsigned_transactions`**: Transaction workflow management
- **`partial_signatures`**: Multi-party signature collection

### User Management
- **`wallet_owners`**: User-wallet relationships with roles
- **`public_keys`**: User extended public keys and device info
- **`server_signers`**: Server-side key management

### Monitoring & Pricing
- **`transactions`**: Confirmed blockchain transactions
- **`prices`**: Cryptocurrency price data from external APIs

## Security Considerations

### Key Management
- Server seed to be stored in a key manager (later to stored on HSM)
- User keys never stored on server
- Multi-signature ensures no single point of failure

### API Security
- JWT-based authentication
- Role-based access control
- Request validation and sanitization
- Admin endpoint protection

### Transaction Security
- PSBT-based transaction flow
- Partial signature verification
- Hardware wallet policy support
- Transaction malleability protection

## Server Key Derivation

### Derivation Scheme

Alpen Safe implements **BIP48** (Multi-Signature HD Wallets) for server key derivation, ensuring compatibility with hardware wallets and industry standards.

#### Derivation Path Structure
```
m / purpose' / coin_type' / account' / script_type' / change / address_index
m / 48'      / 0' (or 1') / account' / 2'          / 0 or 1 / 0, 1, 2...
```

Where:
- **Purpose**: `48'` (BIP48 for multi-signature wallets)
- **Coin Type**: `0'` for Bitcoin mainnet, `1'` for testnet/signet
- **Account**: Unique account identifier for each wallet (e.g., `0'`, `1'`, `2'`...)
- **Script Type**: `2'` for P2WSH (Pay-to-Witness-Script-Hash, native SegWit)
- **Change**: `0` for receive addresses, `1` for change addresses
- **Address Index**: Sequential address index (0, 1, 2, 3...)

#### Example Derivation Paths
```bash
# Master account node (used for xpub generation)
m/48'/0'/0'/2'

# Receive addresses
m/48'/0'/0'/2'/0/0  # First receive address
m/48'/0'/0'/2'/0/1  # Second receive address

# Change addresses  
m/48'/0'/0'/2'/1/0  # First change address
m/48'/0'/0'/2'/1/1  # Second change address
```

### Technical Implementation

#### Libraries Used
- **`bip32`**: Hierarchical Deterministic (HD) key derivation
- **`bitcoinjs-lib`**: Bitcoin protocol primitives and transaction handling
- **`tiny-secp256k1`**: Elliptic curve cryptography operations
- **`ecpair`**: Bitcoin key pair management

#### Key Derivation Process

1. **Master Seed**: Server starts with a secure master seed (256-bit entropy)
   ```typescript
   const masterNode = bip32.fromSeed(serverSeed, network);
   ```

2. **Account Node Derivation**: Each wallet gets a unique hardened account path
   ```typescript
   const hardenedPath = `m/48'/${coinType}'/${accountId}'/2'`;
   const accountNode = masterNode.derivePath(hardenedPath);
   ```

3. **Address Key Derivation**: Individual address keys use non-hardened derivation
   ```typescript
   const childPath = `${changeIndex}/${addressIndex}`;
   const addressNode = accountNode.derivePath(childPath);
   ```

#### Security Features

- **Hardened Derivation**: Account-level keys use hardened derivation (indicated by `'`) for enhanced security
- **Account Isolation**: Each wallet uses a separate account index, preventing key leakage between wallets  
- **BIP48 Compliance**: Full compatibility with hardware wallets and industry-standard software
- **Native SegWit**: Uses P2WSH for lower fees and better security

#### Wallet Descriptor Generation

The service generates Bitcoin Core compatible wallet descriptors:

```
wsh(sortedmulti(2,xpub1/<0;1>/*,xpub2/<0;1>/*,xpub3/<0;1>/*))
```

This descriptor:
- Uses `wsh()` for P2WSH (native SegWit)
- Implements `sortedmulti()` for deterministic key ordering
- Supports both receive (`0`) and change (`1`) address derivation
- Compatible with Sparrow Wallet, Electrum, and other descriptor-aware software

#### Extended Public Key (xpub) Sharing

For each wallet account, the server generates an account-level xpub:
```typescript
const accountXpub = accountNode.neutered().toBase58();
// Example: xpub6C8k9...
```

This xpub can be safely shared with users and imported into hardware wallet software for address verification and transaction validation.

## Environment Configuration

Required environment variables:

```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABSE_SERVICE_KEY=your-service-key

# Bitcoin Network
NETWORK=testnet  # mainnet, testnet, or signet

# Bitcoin Node Integration
ZMQ_URL=tcp://localhost:28332  # Bitcoin Core ZMQ endpoint
ESPLORA_URL=https://blockstream.info/testnet/api  # Esplora API endpoint

# Security
ADMIN_SECRET=your-admin-secret

# Optional
PORT=3000  # Server port (default: 3000)
```

## Background Services

### Cron Jobs
- **Price Updates**: CoinGecko API integration runs every 5 minutes
- **Market Data**: Automatic cryptocurrency price tracking

### Real-Time Monitoring
- **Transaction Listener**: ZMQ connection to Bitcoin Core for real-time transaction monitoring
- **Block Listener**: New block processing and confirmation updates
- **Address Monitoring**: Automatic UTXO detection for all wallet addresses

## Monitoring and Observability

### Logging
- Structured console logging
- Transaction processing logs
- Error tracking and monitoring

### Health Checks
- Database connectivity monitoring
- Bitcoin node connection status
- ZMQ subscription health

## Development Setup

### Prerequisites
- Node.js 20+
- Bitcoin Core node with ZMQ enabled
- Supabase project

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository>
   cd alpen_safe
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup Supabase**:
   ```bash
   npx supabase start
   npm run reset-db  # Apply migrations and generate types
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Available Scripts

```bash
npm run dev          # Development with hot reload
npm run build        # Compile TypeScript
npm run start        # Run compiled JavaScript
npm run test         # Run test suite
npm run lint         # Lint and fix code
npm run serve:prod   # Build and run production server
```

## Testing

The application includes comprehensive test coverage:

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report
```

## Production Deployment

### Docker Deployment

```bash
# Build image
docker build -t alpen-safe .

# Run container
docker run -p 3000:3000 \
  -e SUPABASE_URL=your-url \
  -e SUPABSE_SERVICE_KEY=your-key \
  # ... other environment variables
  alpen-safe
```

### Bitcoin Core Configuration

Enable ZMQ in your `bitcoin.conf`:
```
zmqpubrawblock=tcp://127.0.0.1:28332
zmqpubrawtx=tcp://127.0.0.1:28332
```

## Contributing

1. Follow TypeScript best practices
2. Maintain test coverage for new features
3. Use ESLint configuration for code style
4. Update documentation for API changes

## License

[License information to be added]
