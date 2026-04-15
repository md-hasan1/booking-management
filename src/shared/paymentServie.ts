// shared/paymentService.ts
// NOTE: These values are set directly here (not from env) per your request.
// IMPORTANT: Do NOT commit real production keys to source control. Use this only for local testing.
import crypto from 'crypto';

// // export const PAYFAST_ENDPOINT = 'https://www.payfast.co.za/eng/process'; // change to live endpoint when going to production
// export const PAYFAST_ENDPOINT = 'https://sandbox.payfast.co.za/eng/process'; // change to live endpoint when going to production
// // Validation endpoint used for server-to-server IPN validation
// export const PAYFAST_VALIDATE = 'https://sandbox.payfast.co.za/eng/query/validate';

// Live endpoint for processing payments
export const PAYFAST_ENDPOINT = 'https://www.payfast.co.za/eng/process';

// Live endpoint for server-to-server IPN validation
export const PAYFAST_VALIDATE = 'https://www.payfast.co.za/eng/query/validate';
export const PAYFAST_MERCHANT_ID = '31344227';
export const PAYFAST_MERCHANT_KEY = 'lvymftdltfeca';
export const PAYFAST_PASSPHRASE = 'TimelifyApp1'; // set to '' if you didn't configure a passphrase

/**
 * Build canonical signature string from params (excludes 'signature')
 * - sorts keys alphabetically
 * - encodes values using RFC1738-style encoding (like PHP's urlencode) where spaces become '+'
 */
export function buildSignatureString(params: Record<string, string>, passphrase = ''): string {
  const keys = Object.keys(params).filter(k => k !== 'signature').sort();
  // PayFast expects PHP-style urlencode (spaces -> '+'). Use encodeURIComponent then replace %20 with +
  const pfEncode = (v: string) => encodeURIComponent(v ?? '').replace(/%20/g, '+');
  const pieces = keys.map(k => `${k}=${pfEncode(params[k] ?? '')}`);
  let finalString = pieces.join('&');
  if (passphrase) finalString += `&passphrase=${pfEncode(passphrase)}`;
  return finalString;
}

/**
 * Compute lowercase MD5 hex of finalString
 */
export function computeMd5(finalString: string): string {
  return crypto.createHash('md5').update(finalString).digest('hex').toLowerCase();
}

/**
 * Generate signature and also return the final string (useful for logging/debug)
 */
export function generatePayfastSignature(params: Record<string, string>, passphrase = ''): { signature: string; finalString: string } {
  const finalString = buildSignatureString(params, passphrase);
  const signature = computeMd5(finalString);
  return { signature, finalString };
}

/**
 * Build the subscription/checkout URL to redirect the buyer to PayFast
 */
export function buildSubscriptionUrl(params: Record<string, string>, passphrase = PAYFAST_PASSPHRASE): string {
  const { signature, finalString } = generatePayfastSignature(params, passphrase);

  // build query exactly the same way (sorted keys, encodeURIComponent)
  const pfEncode = (v: string) => encodeURIComponent(v ?? '').replace(/%20/g, '+');
  const query = Object.keys(params)
    .sort()
    .map(k => `${pfEncode(k)}=${pfEncode(params[k] ?? '')}`)
    .join('&');

  const url = `${PAYFAST_ENDPOINT}?${query}&signature=${signature}`;

  // Debug/log (mask merchant_key)
  const masked = url.replace(/(merchant_key=)[^&]+/, '$1[REDACTED]');
  console.log('PayFast endpoint:', PAYFAST_ENDPOINT.includes('sandbox') ? 'sandbox' : 'live');
  console.log('Generated PayFast URL (merchant_key masked):', masked);
  console.log('Final string hashed (for signature):', finalString);
  console.log('Computed signature:', signature);

  return url;
}