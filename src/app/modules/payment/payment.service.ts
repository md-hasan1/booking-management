// modules/payment/payment.service.ts
import { Request } from 'express';
import crypto from 'crypto';
import httpStatus from 'http-status';
import axios from 'axios';
import ApiError from '../../../errors/ApiErrors';
import {
  buildSubscriptionUrl,
  PAYFAST_MERCHANT_ID,
  PAYFAST_MERCHANT_KEY,
  PAYFAST_PASSPHRASE,
  PAYFAST_VALIDATE,
  generatePayfastSignature,
} from '../../../shared/paymentServie';


// You explicitly asked to set values directly — we use the constants exported from shared/paymentService.ts

export const buySubscription = async (opts: {
  userId: string;
  email: string;
  amount?: string; // decimal string with 2 decimals
  itemName?: string;
  notifyUrl?: string;
  returnUrl?: string;
  cancelUrl?: string;
  frequency?: string; // payfast frequency code
  cycles?: string; // number of cycles, 0 for indefinite
}) => {
  const {
    userId,
    email,
    amount = '100.00',
    itemName = 'Pro Membership',
    notifyUrl = 'https://api.mayuranpadayach.smtsigma.com/api/v1/payment/handelIpn',
    returnUrl = 'https://api.mayuranpadayach.smtsigma.com/payment/success',
    cancelUrl = 'https://api.mayuranpadayach.smtsigma.com/payment/cancel',
    frequency = '3',
    cycles = '1',
  } = opts;

  const subscriptionParams: Record<string, string> = {
    merchant_id: PAYFAST_MERCHANT_ID.trim(),
    merchant_key: PAYFAST_MERCHANT_KEY.trim(),
    notify_url: notifyUrl,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    m_payment_id: `sub_${userId}_${Date.now()}`,
    amount: amount,
    item_name: itemName,
    email_address: email,
    subscription_type: '1', // recurring
    billing_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    recurring_amount: amount,
    frequency,
    cycles,
  };

  // Build the PayFast URL. buildSubscriptionUrl logs finalString and signature for debugging.
  const url = buildSubscriptionUrl(subscriptionParams, PAYFAST_PASSPHRASE);

  // Reorder query so merchant_id and merchant_key appear first (signature must remain last).
  // This does NOT change the signature value because signature is computed from the canonical
  // string (sorted keys) — we only reorder the query string for presentation/compatibility.
  try {
    const [base, qs] = url.split('?');
    const pairs = (qs || '').split('&').filter(Boolean);
    const signaturePairIndex = pairs.findIndex(p => p.startsWith('signature='));
    const signaturePair = signaturePairIndex >= 0 ? pairs.splice(signaturePairIndex, 1)[0] : undefined;

    // extract merchant_id and merchant_key pairs
    const merchantIdIndex = pairs.findIndex(p => p.startsWith('merchant_id='));
    const merchantKeyIndex = pairs.findIndex(p => p.startsWith('merchant_key='));
    const merchantIdPair = merchantIdIndex >= 0 ? pairs.splice(merchantIdIndex, 1)[0] : undefined;
    // merchantKeyIndex may shift if merchantId was before it
    const merchantKeyPair = merchantKeyIndex >= 0 ? pairs.find(p => p.startsWith('merchant_key=')) : undefined;
    if (merchantKeyPair) {
      // remove the first occurrence
      const idx = pairs.findIndex(p => p === merchantKeyPair);
      if (idx >= 0) pairs.splice(idx, 1);
    }

    const reordered = [] as string[];
    if (merchantIdPair) reordered.push(merchantIdPair);
    if (merchantKeyPair) reordered.push(merchantKeyPair as string);
    reordered.push(...pairs);
    if (signaturePair) reordered.push(signaturePair);

    const reorderedUrl = `${base}?${reordered.join('&')}`;
    return { url: reorderedUrl, m_payment_id: subscriptionParams.m_payment_id };
  } catch (e) {
    // fallback to original url on any error
    return { url, m_payment_id: subscriptionParams.m_payment_id };
  }
};

/**
 * Debug helper used by an endpoint to return the canonical string and signature
 * for the demo subscription params. Useful to compare against PayFast sandbox logs.
 */
export const debugSubscriptionSignature = async (opts?: Partial<{ userId: string; email: string; amount: string }>) => {
  const userId = opts?.userId ?? 'user123';
  const email = opts?.email ?? 'user123@example.com';
  const amount = opts?.amount ?? '100.00';

  const params: Record<string, string> = {
    merchant_id: PAYFAST_MERCHANT_ID.trim(),
    merchant_key: PAYFAST_MERCHANT_KEY.trim(),
    notify_url: 'https://api.mayuranpadayach.smtsigma.com/api/v1/payment/handelIpn',
    return_url: 'https://api.mayuranpadayach.smtsigma.com/payment/success',
    cancel_url: 'https://api.mayuranpadayach.smtsigma.com/payment/cancel',
    m_payment_id: `sub_${userId}_${Date.now()}`,
    amount,
    item_name: 'Pro Membership',
    email_address: email,
    subscription_type: '1',
    billing_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    recurring_amount: amount,
    frequency: '3',
    cycles: '0',
  };

  const { signature, finalString } = generatePayfastSignature(params, PAYFAST_PASSPHRASE);
  const url = buildSubscriptionUrl(params, PAYFAST_PASSPHRASE);
  return { params, finalString, signature, url };
};

/**
 * IPN verification that uses req.rawBody (must be captured by body-parser verify hook in app)
 * This preserves '+' and percent-encoding exactly as PayFast sent it.
 */
export const handelIpn = async (req: Request) => {
  const ipnData = (req as any).body as Record<string, any>;
  const rawBody = (req as any).rawBody as string | undefined;
  const received = ((ipnData && ipnData.signature) || '').toString().trim().toLowerCase();
  const passphrase = PAYFAST_PASSPHRASE || '';

  if (!rawBody) {
    // If rawBody missing, signature verification is unreliable
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing rawBody for IPN verification. Ensure body-parser verify is configured before parsers.');
  }

  // Recreate PayFast's string from the raw POST (preserve percent-encoding and '+' signs)
  const pairs = rawBody
    .split('&')
    .filter(Boolean)
    .filter(p => p.split('=')[0] !== 'signature');

  pairs.sort((a, b) => {
    const ka = a.split('=')[0];
    const kb = b.split('=')[0];
    return ka.localeCompare(kb);
  });

  let finalString = pairs.join('&');
  const pfEncode = (v: string) => encodeURIComponent(v ?? '').replace(/%20/g, '+');
  if (passphrase) finalString += `&passphrase=${pfEncode(passphrase)}`;
  const expected = crypto.createHash('md5').update(finalString).digest('hex').toLowerCase();

  console.log('IPN rawBody:', rawBody);
  console.log('IPN finalString:', finalString);
  console.log('Computed IPN signature:', expected, 'Received signature:', received);

  if (expected !== received) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, `Invalid signature. computed=${expected} received=${received} finalString=${finalString}`);
  }

  const { payment_status, m_payment_id } = ipnData || {};
  console.log('IPN verified:', payment_status, m_payment_id);
  return { payment_status, m_payment_id, ipnData, finalString };
};

/**
 * Perform server-to-server validation with PayFast after local signature verification.
 * This posts the original IPN data (without signature) back to PayFast validate endpoint.
 */
export const verifyAndValidateIpn = async (req: Request) => {
  // First verify signature locally
  const { ipnData, finalString } = await handelIpn(req);

  // Build validation payload — PayFast expects the same POST string (without signature)
  // Many PayFast guides recommend posting the raw POST (minus signature) and including passphrase.
  const rawBody = (req as any).rawBody as string;
  const bodyPairs = rawBody
    .split('&')
    .filter(Boolean)
    .filter(p => p.split('=')[0] !== 'signature')
    .join('&');

  // Append passphrase if configured — use RFC1738-style encoding so it matches signature generation
  const pfEncode = (v: string) => encodeURIComponent(v ?? '').replace(/%20/g, '+');
  const validationBody = PAYFAST_PASSPHRASE ? `${bodyPairs}&passphrase=${pfEncode(PAYFAST_PASSPHRASE)}` : bodyPairs;

  try {
    const resp = await axios.post(PAYFAST_VALIDATE, validationBody, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10_000,
    });

    const data = (resp && resp.data) ? resp.data.toString() : '';
    console.log('PayFast server validation response:', data);

    if (data !== 'VALID') {
      throw new ApiError(httpStatus.NOT_ACCEPTABLE, `PayFast server validation failed: ${data}`);
    }

    // success
    return { success: true, ipnData };
  } catch (err: any) {
    console.error('Error validating IPN with PayFast:', err?.message || err);
    if (err instanceof ApiError) throw err;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to validate IPN with PayFast');
  }
};

/**
 * Recompute signature for a provided PayFast URL (or query string) and compare with provided signature.
 * Accepts either a full URL or a raw query string. Returns the recomputed finalString and signature and a match flag.
 */
export const verifySignatureForUrl = async (input: { url?: string; query?: string }) => {
  const raw = input.url ? input.url : input.query ? input.query : '';
  if (!raw) throw new Error('url or query required');

  // Extract query string if a full URL provided
  const qs = raw.includes('?') ? raw.split('?').slice(1).join('?') : raw;

  // Parse key=value pairs preserving encoding
  const pairs = qs.split('&').filter(Boolean);
  const params: Record<string, string> = {};
  let providedSignature = '';
  for (const p of pairs) {
    const idx = p.indexOf('=');
    const key = idx >= 0 ? decodeURIComponent(p.slice(0, idx)) : decodeURIComponent(p);
    const value = idx >= 0 ? p.slice(idx + 1) : '';
    if (key === 'signature') {
      providedSignature = value.toLowerCase();
      continue;
    }
    // Treat '+' as space for application/x-www-form-urlencoded values before decoding
    const normalized = value.replace(/\+/g, ' ');
    params[key] = decodeURIComponent(normalized);
  }

  const { signature, finalString } = generatePayfastSignature(params, PAYFAST_PASSPHRASE);
  return { providedSignature, computedSignature: signature, finalString, match: (providedSignature === signature) };
};
export const paymentService = {
  buySubscription,
  handelIpn,
  verifyAndValidateIpn,
  debugSubscriptionSignature,
  verifySignatureForUrl,
};