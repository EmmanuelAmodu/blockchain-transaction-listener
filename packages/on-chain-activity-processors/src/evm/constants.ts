// Canonical ERC event topic constants used across processors and adapters
// ERC-20 and ERC-721 share the same Transfer(address,address,uint256) topic
export const ERC20_ERC721_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// ERC-1155 events
export const ERC1155_TRANSFER_SINGLE_TOPIC =
  '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';
export const ERC1155_TRANSFER_BATCH_TOPIC =
  '0x4a39dc06d4c0dbc64b70b8873d57f8d5d235a1a0c2d3c8e0c6c7a4d27d5dba6c';
