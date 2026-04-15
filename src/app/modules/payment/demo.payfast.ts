import exp from 'constants';
import * as crypto from 'crypto';

// Small PayFast demo: build signed subscription URL and show canonical string + signature.
// Run with: npm run payfast:demo (after setting env vars)

const PF_SANDBOX_PROCESS = 'https://sandbox.payfast.co.za/eng/process';

function pfEncode(v: string): string {
  // encodeURIComponent then convert %20 -> + to match PHP urlencode (RFC1738)
  return encodeURIComponent(v).replace(/%20/g, '+');
}

function buildSignatureString(params: Record<string, string>, passphrase?: string) {
  const keys = Object.keys(params).filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort();

  const parts = keys.map((k) => `${k}=${pfEncode(String(params[k]))}`);
  let final = parts.join('&');
  if (passphrase) {
    final += `&passphrase=${pfEncode(passphrase)}`;
  }
  return final;
}

function computeMd5(str: string) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function generatePayfastSignature(params: Record<string, string>, passphrase?: string) {
  const finalString = buildSignatureString(params, passphrase);
  const signature = computeMd5(finalString);
  return { finalString, signature };
}

function buildSubscriptionUrl(endpoint: string, params: Record<string, string>, passphrase?: string) {
  const { signature } = generatePayfastSignature(params, passphrase);
  const keys = Object.keys(params).sort();
  const query = keys.map((k) => `${k}=${pfEncode(String(params[k]))}`).join('&');
  const url = `${endpoint}?${query}&signature=${signature}`;
  return url;
}

export async function testPayment() {
  const merchant_id = process.env.PAYFAST_MERCHANT_ID || '10000100';
  const merchant_key = process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a';
  const passphrase = process.env.PAYFAST_PASSPHRASE || '';
  const endpoint = process.env.PAYFAST_ENDPOINT || PF_SANDBOX_PROCESS;

  const now = Date.now();
  const m_payment_id = `sub_${now}`;

  // Example subscription parameters (adjust per your PayFast account/docs)
  const params: Record<string, string> = {
    merchant_id: merchant_id,
    merchant_key: merchant_key,
    m_payment_id: m_payment_id,
    amount: (Number(process.env.AMOUNT) || 10.0).toFixed(2),
    item_name: process.env.ITEM_NAME || 'Demo Subscription',
    email_address: process.env.EMAIL_ADDRESS || 'customer@example.com',
    subscription_type: '1', // 1 = subscription
    billing_date: process.env.BILLING_DATE || new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0,10),
    recurring_amount: (Number(process.env.RECURRING_AMOUNT) || 10.0).toFixed(2),
    frequency: process.env.FREQUENCY || '1',
    cycles: process.env.CYCLES || '12',
    notify_url: process.env.NOTIFY_URL || 'https://example.com/api/v1/payment/handelIpn',
    return_url: process.env.RETURN_URL || 'https://example.com/payment/success',
    cancel_url: process.env.CANCEL_URL || 'https://example.com/payment/cancel'
  };

  const { finalString, signature } = generatePayfastSignature(params, passphrase);
  const url = buildSubscriptionUrl(endpoint, params, passphrase);

  console.log('\n--- PayFast Subscription Demo ---');
  console.log('m_payment_id:', m_payment_id);
  console.log('\nCanonical finalString (sorted & RFC1738-encoded):');
  console.log(finalString);
  console.log('\nComputed signature (MD5):', signature);
  console.log('\nSigned URL:');
  console.log(url);

  console.log('\nOptional: auto-submit form (copy/paste into an HTML file to post without re-encoding):\n');
  console.log('<html><body><form id="pf" action="' + endpoint + '" method="post">');
  Object.keys(params).sort().forEach((k) => {
    console.log(`<input type="hidden" name="${k}" value="${params[k]}">`);
  });
  console.log(`<input type="hidden" name="signature" value="${signature}">`);
  console.log('</form><script>document.getElementById("pf").submit()</script></body></html>');
  console.log('\nNote: Ensure your notify_url is reachable by PayFast (use ngrok for local testing).');
}
