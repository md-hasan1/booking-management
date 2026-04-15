// import crypto from 'crypto';

// export function buildSubscriptionUrl(params: Record<string, string>, passphrase?: string): string {
//   const baseUrl = 'https://www.payfast.co.za/eng/process';
//   const sorted = new URLSearchParams();

//   Object.keys(params)
//     .sort()
//     .forEach((key) => sorted.append(key, params[key]));

//   if (passphrase) {
//     const signatureBase = sorted.toString() + '&passphrase=' + passphrase;
//     const signature = crypto.createHash('md5').update(signatureBase).digest('hex');
//     sorted.append('signature', signature);
//   }

//   return `${baseUrl}?${sorted.toString()}`;
// }