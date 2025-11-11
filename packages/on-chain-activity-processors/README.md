# On-chain Activity Processors

Shared processor implementations that transform provider-specific transaction payloads into a common OnChainActivity shape. Intended for reuse across services like activity-listener and wallets-api.

## Usage

- Construct the processor with a handler callback that persists activities.
- Call `process({ transactions })` with provider payloads.
