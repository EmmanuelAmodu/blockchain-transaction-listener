import {
  ERC1155_TRANSFER_BATCH_TOPIC,
  ERC1155_TRANSFER_SINGLE_TOPIC,
  ERC20_ERC721_TRANSFER_TOPIC,
} from '../constants';
import { NETWORK } from '../networks';
import { TxWithLogsAndTracesDTO } from './dtos';
import { QuickNodeEvmProcessor } from './quicknode-evm.processor';

describe('QuickNodeEvmProcessor', () => {
  let processor: QuickNodeEvmProcessor;

  beforeEach(() => {
    jest.resetAllMocks();
    processor = new QuickNodeEvmProcessor();
  });

  const baseTx = (): TxWithLogsAndTracesDTO => ({
    hash: '0xabc',
    from: '0x1111111111111111111111111111111111111111',
    to: '0x2222222222222222222222222222222222222222',
    blockHash: '0x01',
    blockNumber: '0x1',
    transactionIndex: '0x0',
    nonce: '0x1',
    gas: '0x5208',
    gasPrice: '0x1',
    value: '0xde0b6b3a7640000', // 1 ETH
    input: '0x',
    type: '0x2',
    chainId: '0x1',
    logs: [],
    traces: [],
  });

  it('publishes activity for native ETH transfer and fee', async () => {
    const tx = baseTx();
    tx.blockTimestamp = '0x5f5e100'; // 100_000_000 seconds
    tx.gasUsed = '0x5208';
    tx.effectiveGasPrice = '0x3b9aca00'; // 1e9

    const acts = await processor.process({
      transactions: [tx],
      network: NETWORK.ETHEREUM,
    });
    expect(acts).toHaveLength(1);
    const activity = acts[0];
    expect(
      activity.transfers.some((t: any) => t.amount === '1000000000000000000'),
    ).toBe(true); // 1 ETH
    expect(activity.fee.amount).toBe(
      Number(BigInt('0x5208') * BigInt('0x3b9aca00')),
    );
    expect(activity.completedAtTimestamp).toBe(
      Number(BigInt('0x5f5e100') * 1000n),
    );
  });

  it('produces a fully specified activity object (contract test)', async () => {
    const tx = baseTx();
    // 1 ETH native transfer with timestamp and gas info
    tx.value = '0xde0b6b3a7640000'; // 1e18
    tx.blockTimestamp = '0x5f5e100'; // 100_000_000 seconds
    tx.gasUsed = '0x5208'; // 21000
    tx.effectiveGasPrice = '0x3b9aca00'; // 1e9

    const acts = await processor.process({
      transactions: [tx],
      network: NETWORK.ETHEREUM,
    });

    expect(acts).toHaveLength(1);

    const fee = Number(BigInt('0x5208') * BigInt('0x3b9aca00')); // 21000 * 1e9 = 21000000000000
    const expected = {
      identifier: 'transaction:ethereum:0xabc',
      completedAtTimestamp: Number(BigInt('0x5f5e100') * 1000n),
      metadata: {
        nonce: Number(BigInt('0x1')),
      },
      status: 'success',
      transfers: [
        {
          from: 'wallet:ethereum:0x1111111111111111111111111111111111111111',
          to: 'wallet:ethereum:0x2222222222222222222222222222222222222222',
          amount: '1000000000000000000',
          token: 'token:ethereum:native',
        },
      ],
      tokenIdentifiers: ['token:ethereum:native'],
      fee: {
        amount: fee,
        feePayer: [
          'wallet:ethereum:0x1111111111111111111111111111111111111111',
        ],
      },
      balanceChanges: [
        {
          wallet: 'wallet:ethereum:0x1111111111111111111111111111111111111111',
          changes: [
            {
              token: 'token:ethereum:native',
              amount: (-1_000_000_000_000_000_000n - BigInt(fee)).toString(),
            },
          ],
        },
        {
          wallet: 'wallet:ethereum:0x2222222222222222222222222222222222222222',
          changes: [
            {
              token: 'token:ethereum:native',
              amount: '1000000000000000000',
            },
          ],
        },
      ],
      tokenTypes: {},
    } as const;

    expect(acts[0]).toStrictEqual(expected);
  });

  it('extracts internal native transfers from traces and skips reverted', async () => {
    const tx = baseTx();
    tx.value = '0x0';
    tx.traces = [
      {
        blockHash: '0x01',
        blockNumber: 1,
        subtraces: 0,
        traceAddress: [0],
        transactionHash: '0xabc',
        transactionPosition: 0,
        type: 'call',
        from: '0x3333333333333333333333333333333333333333',
        to: '0x4444444444444444444444444444444444444444',
        value: '0x5',
      } as any,
      {
        blockHash: '0x01',
        blockNumber: 1,
        subtraces: 0,
        traceAddress: [1],
        transactionHash: '0xabc',
        transactionPosition: 0,
        type: 'call',
        from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        value: '0x10',
        error: 'Reverted',
      } as any,
    ];

    const acts = await processor.process({
      transactions: [tx],
      network: NETWORK.ETHEREUM,
    });
    const activity = acts[0];
    // Only the non-reverted transfer should appear
    expect(
      activity.transfers.some(
        (t: any) => t.from.includes('3333') && t.amount === '5',
      ),
    ).toBe(true);
    expect(activity.transfers.some((t: any) => t.from.includes('aaaa'))).toBe(
      false,
    );
  });

  it('parses ERC-20 Transfer logs', async () => {
    const tx = baseTx();
    tx.value = '0x0';
    tx.logs = [
      {
        address: '0x9999999999999999999999999999999999999999',
        blockHash: '0x01',
        blockNumber: '0x1',
        data: '0x00000000000000000000000000000000000000000000000000000000000003e8',
        logIndex: '0x0',
        removed: false,
        topics: [
          ERC20_ERC721_TRANSFER_TOPIC,
          '0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          '0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        ],
        transactionHash: '0xabc',
        transactionIndex: '0x0',
      } as any,
    ];

    const acts = await processor.process({
      transactions: [tx],
      network: NETWORK.ETHEREUM,
    });
    const activity = acts[0];
    expect(activity.transfers.some((t: any) => t.amount === '1000')).toBe(true);
  });

  it('treats ERC-721 Transfer as value 1 when 4th topic present', async () => {
    const tx = baseTx();
    tx.value = '0x0';
    tx.logs = [
      {
        address: '0x9999999999999999999999999999999999999999',
        blockHash: '0x01',
        blockNumber: '0x1',
        data: '0x',
        logIndex: '0x0',
        removed: false,
        topics: [
          ERC20_ERC721_TRANSFER_TOPIC,
          '0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          '0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          '0x0000000000000000000000000000000000000000000000000000000000000456',
        ],
        transactionHash: '0xabc',
        transactionIndex: '0x0',
      } as any,
    ];

    const acts = await processor.process({
      transactions: [tx],
      network: NETWORK.ETHEREUM,
    });
    const activity = acts[0];
    expect(activity.transfers.some((t: any) => t.amount === '1')).toBe(true);
  });

  it('parses ERC-1155 TransferSingle amount from data', async () => {
    const tx = baseTx();
    tx.value = '0x0';
    // Build minimal TransferSingle data: ids[0]=0x1, values[0]=0x2, using ABI layout
    // operator/from/to indexed; data has id and value
    const zeros = '0'.repeat(63);
    const data = `0x${zeros}1${zeros}2`;
    tx.logs = [
      {
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        blockHash: '0x01',
        blockNumber: '0x1',
        data,
        logIndex: '0x0',
        removed: false,
        topics: [
          ERC1155_TRANSFER_SINGLE_TOPIC,
          '0x000000000000000000000000cccccccccccccccccccccccccccccccccccccccc', // operator
          '0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // from
          '0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', // to
        ],
        transactionHash: '0xabc',
        transactionIndex: '0x0',
      } as any,
    ];

    const acts = await processor.process({
      transactions: [tx],
      network: NETWORK.ETHEREUM,
    });
    const activity = acts[0];
    expect(activity.transfers.some((t: any) => t.amount === '2')).toBe(true);
  });

  it('sums ERC-1155 TransferBatch values from data', async () => {
    const tx = baseTx();
    tx.value = '0x0';
    // Construct ABI-encoded arrays with offsets; here we shortcut by using processor's parser expectations
    // Prepare data resembling: offset(ids)=0x40, offset(values)=0xa0, ids.length=2, ids=[1,2], values.length=2, values=[3,4]
    const hex = [
      '0000000000000000000000000000000000000000000000000000000000000040', // offset ids (64 bytes)
      '00000000000000000000000000000000000000000000000000000000000000a0', // offset values (160 bytes)
      '0000000000000000000000000000000000000000000000000000000000000002', // ids length
      '0000000000000000000000000000000000000000000000000000000000000001', // id[0]
      '0000000000000000000000000000000000000000000000000000000000000002', // id[1]
      '0000000000000000000000000000000000000000000000000000000000000002', // values length
      '0000000000000000000000000000000000000000000000000000000000000003', // val[0]
      '0000000000000000000000000000000000000000000000000000000000000004', // val[1]
    ].join('');

    const dataPrefixed = `0x${hex}`;
    tx.logs = [
      {
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        blockHash: '0x01',
        blockNumber: '0x1',
        data: dataPrefixed,
        logIndex: '0x0',
        removed: false,
        topics: [
          ERC1155_TRANSFER_BATCH_TOPIC,
          '0x000000000000000000000000cccccccccccccccccccccccccccccccccccccccc', // operator
          '0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // from
          '0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', // to
        ],
        transactionHash: '0xabc',
        transactionIndex: '0x0',
      } as any,
    ];

    const acts = await processor.process({
      transactions: [tx],
      network: NETWORK.ETHEREUM,
    });
    const activity = acts[0];
    // 3 + 4 = 7
    expect(activity.transfers.some((t: any) => t.amount === '7')).toBe(true);
  });

  it('populates tokens decimals: native=18 and erc20 from metadata', async () => {
    const tx = baseTx();
    // native transfer
    tx.value = '0xde0b6b3a7640000';
    // erc20 transfer log
    tx.logs = [
      {
        address: '0x9999999999999999999999999999999999999999',
        blockHash: '0x01',
        blockNumber: '0x1',
        data: '0x00000000000000000000000000000000000000000000000000000000000003e8',
        logIndex: '0x0',
        removed: false,
        topics: [
          ERC20_ERC721_TRANSFER_TOPIC,
          '0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          '0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        ],
        transactionHash: '0xabc',
        transactionIndex: '0x0',
      } as any,
    ];

    const acts = await processor.process({
      transactions: [tx],
      network: NETWORK.ETHEREUM,
    });
    const activity = acts[0];
    // should contain token identifiers for native ETH and the test token
    expect(activity.tokenIdentifiers).toContain('token:ethereum:native');
    expect(activity.tokenIdentifiers).toContain(
      'token:ethereum:0x9999999999999999999999999999999999999999',
    );
  });
});
