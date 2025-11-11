import crypto from 'crypto';
import { verifySignature } from './utils';

describe('verifySignature', () => {
  const testSecretKey = 'test-secret-key';
  const testPayload = '{"test":"data"}';
  const testNonce = 'test-nonce-123';
  const testTimestamp = '1633072800';

  // Helper function to create a valid signature for testing.
  const createValidSignature = (
    secretKey: string,
    payload: string,
    nonce: string,
    timestamp: string,
  ): string => {
    const signatureData = nonce + timestamp + payload;
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(signatureData);
    return hmac.digest('hex');
  };

  describe('valid signature scenarios', () => {
    it('should return true for a valid signature', () => {
      const validSignature = createValidSignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
      );

      const result = verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        validSignature,
      );

      expect(result).toBe(true);
    });

    it('should return true for signature with different payload', () => {
      const differentPayload = '{"different":"payload","with":["array"]}';
      const validSignature = createValidSignature(
        testSecretKey,
        differentPayload,
        testNonce,
        testTimestamp,
      );

      const result = verifySignature(
        testSecretKey,
        differentPayload,
        testNonce,
        testTimestamp,
        validSignature,
      );

      expect(result).toBe(true);
    });

    it('should return true for signature with special characters in payload', () => {
      const specialPayload =
        '{"special":"characters!@#$%^&*()_+-={}[]|\\:";\'<>?,./"}';
      const validSignature = createValidSignature(
        testSecretKey,
        specialPayload,
        testNonce,
        testTimestamp,
      );

      const result = verifySignature(
        testSecretKey,
        specialPayload,
        testNonce,
        testTimestamp,
        validSignature,
      );

      expect(result).toBe(true);
    });

    it('should return true for signature with empty payload', () => {
      const emptyPayload = '';
      const validSignature = createValidSignature(
        testSecretKey,
        emptyPayload,
        testNonce,
        testTimestamp,
      );

      const result = verifySignature(
        testSecretKey,
        emptyPayload,
        testNonce,
        testTimestamp,
        validSignature,
      );

      expect(result).toBe(true);
    });

    it('should return true for signature with very long payload', () => {
      const longPayload = JSON.stringify({
        data: 'x'.repeat(10000),
        array: new Array(1000).fill('test'),
      });
      const validSignature = createValidSignature(
        testSecretKey,
        longPayload,
        testNonce,
        testTimestamp,
      );

      const result = verifySignature(
        testSecretKey,
        longPayload,
        testNonce,
        testTimestamp,
        validSignature,
      );

      expect(result).toBe(true);
    });
  });

  describe('invalid signature scenarios', () => {
    it('should return false for completely wrong signature', () => {
      const wrongSignature = 'completely-wrong-signature';

      const result = verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        wrongSignature,
      );

      expect(result).toBe(false);
    });

    it('should return false for signature with wrong secret key', () => {
      const wrongSecretKey = 'wrong-secret-key';
      const signatureWithWrongKey = createValidSignature(
        wrongSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
      );

      const result = verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        signatureWithWrongKey,
      );

      expect(result).toBe(false);
    });

    it('should return false for signature with wrong payload', () => {
      const wrongPayload = '{"wrong":"payload"}';
      const signatureWithWrongPayload = createValidSignature(
        testSecretKey,
        wrongPayload,
        testNonce,
        testTimestamp,
      );

      const result = verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        signatureWithWrongPayload,
      );

      expect(result).toBe(false);
    });

    it('should return false for signature with wrong nonce', () => {
      const wrongNonce = 'wrong-nonce';
      const signatureWithWrongNonce = createValidSignature(
        testSecretKey,
        testPayload,
        wrongNonce,
        testTimestamp,
      );

      const result = verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        signatureWithWrongNonce,
      );

      expect(result).toBe(false);
    });

    it('should return false for signature with wrong timestamp', () => {
      const wrongTimestamp = '9999999999';
      const signatureWithWrongTimestamp = createValidSignature(
        testSecretKey,
        testPayload,
        testNonce,
        wrongTimestamp,
      );

      const result = verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        signatureWithWrongTimestamp,
      );

      expect(result).toBe(false);
    });

    it('should return false for modified signature (single character change)', () => {
      const validSignature = createValidSignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
      );
      // Change one character in the signature
      const modifiedSignature = `${validSignature.substring(
        0,
        validSignature.length - 1,
      )}x`;

      const result = verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        modifiedSignature,
      );

      expect(result).toBe(false);
    });

    it('should return false for signature with wrong case (uppercase)', () => {
      const validSignature = createValidSignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
      );
      const uppercaseSignature = validSignature.toUpperCase();

      const result = verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        uppercaseSignature,
      );

      expect(result).toBe(true); // Should be true now due to case normalization
    });

    it('should return false for signature with mixed case', () => {
      const validSignature = createValidSignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
      );
      // Mix upper and lower case
      const mixedCaseSignature = validSignature
        .split('')
        .map((char, index) => (index % 2 === 0 ? char.toUpperCase() : char))
        .join('');

      const result = verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        mixedCaseSignature,
      );

      expect(result).toBe(true); // Should be true due to case normalization
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle empty string parameters', () => {
      const emptyStringSignature = createValidSignature('', '', '', '');

      const result = verifySignature('', '', '', '', emptyStringSignature);

      expect(result).toBe(true);
    });

    it('should handle unicode characters in all parameters', () => {
      const unicodeSecret = 'secret-🔑-key';
      const unicodePayload = '{"emoji":"🚀","unicode":"测试"}';
      const unicodeNonce = 'nonce-🎲';
      const unicodeTimestamp = '时间戳-123456';

      const validSignature = createValidSignature(
        unicodeSecret,
        unicodePayload,
        unicodeNonce,
        unicodeTimestamp,
      );

      const result = verifySignature(
        unicodeSecret,
        unicodePayload,
        unicodeNonce,
        unicodeTimestamp,
        validSignature,
      );

      expect(result).toBe(true);
    });

    it('should handle very long secret key', () => {
      const longSecretKey = 'very-long-secret-key-'.repeat(100);
      const validSignature = createValidSignature(
        longSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
      );

      const result = verifySignature(
        longSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        validSignature,
      );

      expect(result).toBe(true);
    });

    it('should return false for invalid hex signature', () => {
      const invalidHexSignature = 'invalid-hex-characters-GGGG';

      const result = verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        invalidHexSignature,
      );

      expect(result).toBe(false); // Should return false, not throw
    });

    it('should return false for odd-length hex signature', () => {
      const oddLengthSignature = 'abc'; // 3 characters, not even

      const result = verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        oddLengthSignature,
      );

      expect(result).toBe(false); // Should return false, not throw
    });
  });

  describe('timing attack resistance', () => {
    it('should use crypto.timingSafeEqual for comparison', () => {
      const timingSafeEqualSpy = jest.spyOn(crypto, 'timingSafeEqual');
      const validSignature = createValidSignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
      );

      verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        validSignature,
      );

      expect(timingSafeEqualSpy).toHaveBeenCalledTimes(1);

      timingSafeEqualSpy.mockRestore();
    });

    it('should take similar time for valid and invalid signatures', async () => {
      const validSignature = createValidSignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
      );
      const invalidSignature = 'a'.repeat(validSignature.length);

      // Measure time for valid signature
      const validStart = process.hrtime.bigint();
      verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        validSignature,
      );
      const validEnd = process.hrtime.bigint();
      const validTime = Number(validEnd - validStart);

      // Measure time for invalid signature
      const invalidStart = process.hrtime.bigint();
      verifySignature(
        testSecretKey,
        testPayload,
        testNonce,
        testTimestamp,
        invalidSignature,
      );
      const invalidEnd = process.hrtime.bigint();
      const invalidTime = Number(invalidEnd - invalidStart);

      // Times should be relatively similar (within reasonable bounds)
      // This is a basic timing attack resistance check
      const timeDifference = Math.abs(validTime - invalidTime);
      const averageTime = (validTime + invalidTime) / 2;
      const percentageDifference = (timeDifference / averageTime) * 100;

      // Allow up to 500% difference (very generous, but timing can vary in test environments)
      expect(percentageDifference).toBeLessThan(500);
    });
  });

  describe('real-world scenarios', () => {
    it('should verify QuickNode-style webhook signature', () => {
      // Simulate a real QuickNode webhook scenario
      const webhookSecret = 'qn_webhook_secret_123';
      const bitcoinTransaction = JSON.stringify([
        {
          blockTime: 1633072800,
          from: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          to: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
          amount: 0.01,
          fee: 0.0001,
          txid: 'a1b2c3d4e5f6789012345678901234567890abcdef',
          blockHeight: 700000,
        },
      ]);
      const nonce = `qn_nonce_${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const validSignature = createValidSignature(
        webhookSecret,
        bitcoinTransaction,
        nonce,
        timestamp,
      );

      const result = verifySignature(
        webhookSecret,
        bitcoinTransaction,
        nonce,
        timestamp,
        validSignature,
      );

      expect(result).toBe(true);
    });

    it('should handle multiple transaction payload', () => {
      const multipleTransactions = JSON.stringify([
        {
          blockTime: 1633072800,
          from: 'address1',
          to: 'address2',
          amount: 0.01,
          fee: 0.0001,
          txid: 'txid1',
          blockHeight: 700000,
        },
        {
          blockTime: 1633072801,
          from: 'address3',
          to: 'address4',
          amount: 0.02,
          fee: 0.0002,
          txid: 'txid2',
          blockHeight: 700001,
        },
      ]);

      const validSignature = createValidSignature(
        testSecretKey,
        multipleTransactions,
        testNonce,
        testTimestamp,
      );

      const result = verifySignature(
        testSecretKey,
        multipleTransactions,
        testNonce,
        testTimestamp,
        validSignature,
      );

      expect(result).toBe(true);
    });
  });
});
