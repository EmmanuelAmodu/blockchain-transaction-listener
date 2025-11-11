/* eslint-disable */

const TRC20_ABI = `[{
    "anonymous": false,
    "inputs": [
      {"indexed": true, "type": "address", "name": "from"},
      {"indexed": true, "type": "address", "name": "to"},
      {"indexed": false, "type": "uint256", "name": "value"}
    ],
    "name": "Transfer",
    "type": "event"
  }]`;

async function isTronWatchedWallet(address) {
  const serializedAddress = address.toLowerCase();
  return qnLib.qnContainsListItem('tron-watched-wallets', serializedAddress);
}

async function receiptContainsWatchedWallet(receipt) {
  const [fromWatched, toWatched] = await Promise.all([
    isTronWatchedWallet(receipt.from),
    isTronWatchedWallet(receipt.to),
  ]);

  return fromWatched || toWatched;
}

async function main(stream) {
  const data = stream.data ? stream.data : stream;

  let decodedReceipts = decodeEVMReceipts(data[0].receipts, [TRC20_ABI]);

  const filteredReceipts = await Promise.all(
    decodedReceipts.map(async (receipt, index) => {
      try {
        const containsWatchedWallet = await receiptContainsWatchedWallet(
          receipt,
        );

        if (!containsWatchedWallet) {
          return null;
        }
        const transaction = data[0].block.transactions[index];
        return {
          ...receipt,
          nonce: transaction.nonce,
          timestamp: Date.now(),
          value: transaction.value,
        };
      } catch (e) {
        console.error(`Error processing tx ${receipt?.transactionHash}:`, e);
        return null;
      }
    }),
  ).then((results) => results.filter(Boolean));

  return filteredReceipts;
}
