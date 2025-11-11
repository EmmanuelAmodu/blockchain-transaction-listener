/* eslint-disable */

async function isWatchedWallet(address) {
  return qnLib.qnContainsListItem('xrpl-watched-wallets', address);
}

async function main(stream) {
  const matchingTxs = [];

  for (const block of stream.data) {
    for (const tx of block.ledger.transactions || []) {
      if (tx.metaData?.TransactionResult !== 'tesSUCCESS') continue;

      try {
        const [from, to] = await Promise.all([
          isWatchedWallet(tx.Account),
          ...(tx.Destination ? [isWatchedWallet(tx.Destination)] : [false]),
        ]);

        if (from || to) {
          matchingTxs.push({
            timestamp: block.ledger.close_time_iso,
            ...tx,
          });
        }
      } catch (e) {
        console.error(`Error processing tx ${tx?.txid}:`, e);
      }
    }
  }
  return matchingTxs;
}
