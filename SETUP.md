# OnionFi On-Chain Transaction Listener - Setup Guide

## Overview
This service monitors blockchain transactions across multiple networks (Bitcoin, Ethereum, Solana, etc.) and publishes activity to Google Cloud Pub/Sub.

## Prerequisites

1. **Node.js** (v16+)
2. **Blockchain Node Providers**:
   - Helius account (for Solana)
   - QuickNode accounts (for Bitcoin, EVM chains, Tron, XRPL)
3. **Optional**: Google Cloud SDK for production PubSub (local emulator works without it)

## Initial Setup

### 1. Install Dependencies

From the project root:

```bash
npm install
```

### 2. Configure Environment Variables

Update the `.env` file at `apps/on-chain-transaction-listener/.env` with your actual API keys and webhook secrets:

```bash
# Core Configuration
GOOGLE_CLOUD_PROJECT=onionfi-dev
NODE_ENV=development
PORT=3000

# PubSub Configuration (for local emulator)
PUBSUB_EMULATOR_HOST=http://localhost:8086
PUBSUB_PROJECT_ID=onionfi-services-sandbox
PUBSUB_FLOW_MAX_MESSAGES=50

# Development Features
ENABLE_SWAGGER_UI=true

# ============================================
# Helius (Solana) Configuration
# ============================================
HELIUS_API_KEY=your-helius-api-key-here
HELIUS_WEBHOOK_SECRET=your-helius-webhook-secret-here

# ============================================
# QuickNode Webhook Secrets
# ============================================
QUICKNODE_BTC_WEBHOOK_SECRET=your-bitcoin-webhook-secret
QUICKNODE_ETH_WEBHOOK_SECRET=your-ethereum-webhook-secret
QUICKNODE_POLYGON_WEBHOOK_SECRET=your-polygon-webhook-secret
QUICKNODE_ARBITRUM_WEBHOOK_SECRET=your-arbitrum-webhook-secret
QUICKNODE_OPTIMISM_WEBHOOK_SECRET=your-optimism-webhook-secret
QUICKNODE_BASE_WEBHOOK_SECRET=your-base-webhook-secret
QUICKNODE_BSC_WEBHOOK_SECRET=your-bsc-webhook-secret
QUICKNODE_XRPL_WEBHOOK_SECRET=your-xrpl-webhook-secret
QUICKNODE_TRON_WEBHOOK_SECRET=your-tron-webhook-secret
```

**Important**: Replace all `your-*-here` placeholders with your actual API keys and secrets from Helius and QuickNode.

### 3. Setup PubSub Emulator (for local development)

If using the PubSub emulator for local development:

```bash
# Check if pubsub:setup script exists in package.json
npm run pubsub:setup
```

If the script doesn't exist, you'll need to:
1. Start the PubSub emulator
2. Create the required topic: `on-chain-activity`
3. Create subscriptions as needed

### 4. Build the Application

```bash
npm run build
```

### 5. Start the Application

**Development mode:**
```bash
npm run start:dev
```

**Production mode:**
```bash
npm run start:prod
```

## Accessing the Application

- **API**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/openapi (if `ENABLE_SWAGGER_UI=true`)
- **PubSub UI**: http://localhost:7200/ (for emulator, pointing to http://localhost:8086)

## Webhook Endpoints

The service exposes the following webhook endpoints:

### Solana (Helius)
- `POST /webhooks/helius/enhanced-transaction`

### Bitcoin (QuickNode)
- `POST /webhooks/quicknode/bitcoin`

### EVM Chains (QuickNode)
- `POST /webhooks/quicknode/evm/ethereum`
- `POST /webhooks/quicknode/evm/polygon`
- `POST /webhooks/quicknode/evm/arbitrum`
- `POST /webhooks/quicknode/evm/optimism`
- `POST /webhooks/quicknode/evm/base`
- `POST /webhooks/quicknode/evm/bsc`

### Other Chains
- `POST /webhooks/quicknode/tron`
- `POST /webhooks/quicknode/xrpl`

## Internal Packages Required

Ensure these packages exist in the monorepo:

- `@onionfi-internal/blockchain-identifier-utils`
- `@onionfi-internal/on-chain-activity-processors`
- `@onionfi-internal/nestjs`
- `@onionfi-internal/pubsub-client`
- `@onionfi-internal/pubsub-server`
- `@onionfi-internal/secrets`
- `@onionfi-internal/dd` (DataDog)

These should be in the `packages/` directory and referenced in the workspace configuration.

## QuickNode Stream Filters

The `quicknode-streams-filters/` directory contains filter scripts that run on QuickNode's infrastructure to filter transactions before sending webhooks. These include:

- `bitcoin.js` - Filters Bitcoin transactions for watched wallets
- `evm_debug_trace.js` - EVM transaction trace filtering
- `evm_trace_block.js` - EVM block trace filtering
- `tron.js` - Tron transaction filtering
- `xrpl.js` - XRP Ledger transaction filtering

Upload these to your QuickNode Stream configurations.

## Troubleshooting

### Missing Internal Packages
If you get import errors for `@onionfi-internal/*` packages, ensure:
1. They exist in `packages/` directory
2. You've run `npm install` from the root
3. The packages are properly configured in turbo.json

### Missing Environment Variables
If the app fails to start due to missing secrets:
1. Check that all required variables are set in `.env`
2. Ensure `.env` file is in the correct location: `apps/on-chain-transaction-listener/.env`
3. Verify there are no typos in variable names

### PubSub Connection Issues
1. Ensure emulator is running on the correct port (8086)
2. Check `PUBSUB_EMULATOR_HOST` environment variable
3. Verify project ID matches

### Build Errors
1. Run `npm run prebuild` to clear old build artifacts
2. Check TypeScript version compatibility
3. Ensure all internal packages are built

## Development Workflow

1. Make changes to the code
2. Application auto-reloads in dev mode (`npm run start:dev`)
3. Test webhooks using tools like Postman or curl
4. Check output in `./output/` directory (dev mode) or PubSub (prod mode)
5. View logs in console or DataDog

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:cov
```

## Next Steps

1. ✅ Create `.env` file
2. ✅ Configure environment-based secrets (no GCP Secret Manager needed)
3. ⚠️ Install dependencies
4. ⚠️ Add your actual API keys and webhook secrets to `.env`
5. ⚠️ Setup PubSub emulator or cloud instance
6. ⚠️ Configure QuickNode webhooks
7. ⚠️ Configure Helius webhooks
8. ⚠️ Build and run the application

Legend: ✅ Done | ⚠️ Needs attention
