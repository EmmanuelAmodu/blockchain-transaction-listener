/* eslint-disable */

const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'; // ERC-20 / ERC-721 Transfer(address,address,uint256)
const TRANSFER_SINGLE_TOPIC =
  '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'; // ERC-1155 TransferSingle
const TRANSFER_BATCH_TOPIC =
  '0x4a39dc06d4c0dbc64b70b8873d57f8d5d235a1a0c2d3c8e0c6c7a4d27d5dba6c'; // ERC-1155 TransferBatch

function normalizeAddress(addr) {
  if (!addr || typeof addr !== 'string') return null;
  const a = addr.toLowerCase();
  return a.startsWith('0x') && a.length === 42 ? a : null;
}

function topicToAddress(topic) {
  if (!topic || typeof topic !== 'string') return null;
  const hex = topic.toLowerCase();
  if (!hex.startsWith('0x')) return null;
  return '0x' + hex.slice(-40);
}

function isEvmWatchedWallet(address) {
  const a = normalizeAddress(address);
  if (!a) return Promise.reject(new Error('invalid address'));
  return qnLib.qnContainsListItem('evm-watched-wallets', a).then((found) => {
    if (found) return true;
    throw new Error('not watched');
  });
}

function extractTransactions(batch) {
  return Array.isArray(batch?.block?.transactions)
    ? batch.block.transactions
    : Array.isArray(batch?.transactions)
    ? batch.transactions
    : [];
}

function extractReceipts(batch) {
  return Array.isArray(batch?.receipts) ? batch.receipts : [];
}

function extractTraces(batch) {
  if (Array.isArray(batch?.traces)) return batch.traces;
  if (Array.isArray(batch?.trace)) return batch.trace;
  if (Array.isArray(batch?.calls)) return batch.calls;
  return [];
}

function groupByTxHash(items, getHash) {
  const map = new Map();
  for (const it of Array.isArray(items) ? items : []) {
    const h = (getHash(it) || '').toLowerCase();
    if (!h) continue;
    if (!map.has(h)) map.set(h, []);
    map.get(h).push(it);
  }
  return map;
}

function collectAddressesFromTx(tx, addrSet) {
  const f = normalizeAddress(tx?.from);
  const t = normalizeAddress(tx?.to);
  if (f) addrSet.add(f);
  if (t) addrSet.add(t);
}

function collectAddressesFromLogs(logs, addrSet) {
  for (const lg of Array.isArray(logs) ? logs : []) {
    try {
      const topics = Array.isArray(lg?.topics) ? lg.topics : [];
      const t0 = (topics[0] || '').toLowerCase();

      if (t0 === TRANSFER_TOPIC && topics.length >= 3) {
        const from = topicToAddress(topics[1]);
        const to = topicToAddress(topics[2]);
        if (from) addrSet.add(from);
        if (to) addrSet.add(to);
        continue;
      }

      if (t0 === TRANSFER_SINGLE_TOPIC && topics.length >= 4) {
        const from = topicToAddress(topics[2]);
        const to = topicToAddress(topics[3]);
        if (from) addrSet.add(from);
        if (to) addrSet.add(to);
        continue;
      }

      if (t0 === TRANSFER_BATCH_TOPIC && topics.length >= 4) {
        const from = topicToAddress(topics[2]);
        const to = topicToAddress(topics[3]);
        if (from) addrSet.add(from);
        if (to) addrSet.add(to);
        continue;
      }
    } catch (e) {
      console.error('log parse error:', e);
    }
  }
}

function deriveTokenTypesFromLogs(logs) {
  const tokenTypes = {};
  for (const lg of Array.isArray(logs) ? logs : []) {
    const addr = normalizeAddress(lg?.address);
    if (!addr) continue;
    const topics = Array.isArray(lg?.topics) ? lg.topics : [];
    const t0 = (topics[0] || '').toLowerCase();
    if (t0 === TRANSFER_SINGLE_TOPIC || t0 === TRANSFER_BATCH_TOPIC) {
      tokenTypes[addr] = 'erc1155';
      continue;
    }
    if (t0 === TRANSFER_TOPIC) {
      if (topics.length >= 4) {
        tokenTypes[addr] = 'erc721';
      } else if (!tokenTypes[addr]) {
        tokenTypes[addr] = 'erc20';
      }
    }
  }
  return tokenTypes;
}

function collectAddressesFromTraces(traces, addrSet) {
  for (const n of Array.isArray(traces) ? traces : []) {
    try {
      const from = normalizeAddress(n?.from ?? n?.action?.from);
      const to = normalizeAddress(n?.to ?? n?.action?.to);
      if (from) addrSet.add(from);
      if (to) addrSet.add(to);
    } catch (e) {
      console.error('trace parse error:', e);
    }
  }
}

async function main(stream) {
  const matches = [];
  const batches = Array.isArray(stream?.data) ? stream.data : [];

  for (const batch of batches) {
    const blockTimestamp = batch?.block?.timestamp ?? batch?.timestamp;
    const txs = extractTransactions(batch);
    if (!txs.length) continue;

    const receiptsByTx = groupByTxHash(
      extractReceipts(batch),
      (r) => r?.transactionHash,
    );
    const tracesByTx = groupByTxHash(
      extractTraces(batch),
      (t) => t?.transactionHash || t?.txHash || t?.transaction_hash || t?.hash,
    );

    for (const tx of txs) {
      const h = (tx?.hash || '').toLowerCase();
      if (!h) continue;

      const receipt = (receiptsByTx.get(h) || [])[0] || null;
      const logs =
        (receipt?.logs && Array.isArray(receipt.logs) ? receipt.logs : []) ||
        [];
      const tokenTypes = deriveTokenTypesFromLogs(logs);
      const traces = tracesByTx.get(h) || [];

      const addrSet = new Set();
      collectAddressesFromTx(tx, addrSet);
      collectAddressesFromLogs(logs, addrSet);
      collectAddressesFromTraces(traces, addrSet);
      const addresses = Array.from(addrSet);

      if (!addresses.length) continue;

      try {
        await Promise.any(addresses.map(isEvmWatchedWallet));
        matches.push({
          ...tx,
          blockTimestamp,
          logs,
          traces,
          gasUsed: receipt?.gasUsed,
          effectiveGasPrice: receipt?.effectiveGasPrice,
          tokenTypes,
        });
      } catch (aggregateErr) {}
    }
  }

  return matches;
}
