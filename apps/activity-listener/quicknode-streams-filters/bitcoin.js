/* eslint-disable */

async function isBtcWatchedWallet(address) {
  return qnLib.qnContainsListItem('bitcoin-watched-wallets', address);
}

async function hasWatchedWalletInTransaction(tx) {
  const addresses = new Set();

  for (const input of tx.vin || []) {
    if (input.isAddress && input.addresses?.length) {
      addresses.add(input.addresses[0]);
    }
  }

  for (const output of tx.vout || []) {
    if (output.isAddress && output.addresses?.length) {
      addresses.add(output.addresses[0]);
    }
  }

  const checks = Array.from(addresses, isBtcWatchedWallet);
  const results = await Promise.all(checks);
  return results.some(Boolean);
}

async function main(stream) {
  const matchingTxs = [];
  for (const block of stream.data) {
    for (const tx of block.txs || []) {
      try {
        if (await hasWatchedWalletInTransaction(tx)) {
          matchingTxs.push(tx);
        }
      } catch (e) {
        console.error(`Error processing tx ${tx?.txid}:`, e);
      }
    }
  }
  return matchingTxs;
}
