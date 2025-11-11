import crypto from 'crypto';

export const verifySignature = (
  secretKey: string,
  payload: string,
  nonce: string,
  timestamp: string,
  givenSignature: string,
) => {
  try {
    // First concatenate as strings
    const signatureData = nonce + timestamp + payload;

    // Convert to bytes
    const signatureBytes = signatureData; // use string directly

    // Create HMAC with secret key converted to bytes
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(signatureBytes);
    const computedSignature = hmac.digest('hex');

    // Ensure both signatures are the same length and valid hex
    if (givenSignature.length !== computedSignature.length) {
      return false;
    }

    // Convert to lowercase for consistent comparison
    const normalizedGivenSignature = givenSignature.toLowerCase();
    const normalizedComputedSignature = computedSignature.toLowerCase();

    return crypto.timingSafeEqual(
      new Uint8Array(Buffer.from(normalizedComputedSignature, 'hex')),
      new Uint8Array(Buffer.from(normalizedGivenSignature, 'hex')),
    );
  } catch (error) {
    // If any error occurs (invalid hex, etc.), signature is invalid
    return false;
  }
};
