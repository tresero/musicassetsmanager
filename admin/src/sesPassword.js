// Amazon SES over SMTP takes an IAM access key ID as the username, but not the
// secret key as the password: the password is made from the secret key for one
// region, by the method in the SES developer guide ("Obtaining Amazon SES SMTP
// credentials by converting existing AWS credentials"). The Email sending page
// does that here, in the browser, so only the SMTP password is sent and saved.

// The region of an SES SMTP server name, or null for any other server.
export const sesRegion = (host) => {
  const m = /^email-smtp(?:-fips)?\.([a-z0-9-]+)\.amazonaws\.com$/.exec((host || '').trim().toLowerCase());
  return m ? m[1] : null;
};

// A secret access key is 40 characters; an SES SMTP password is 44.
export const looksLikeAwsSecret = (value) => /^[A-Za-z0-9/+]{40}$/.test((value || '').trim());

const hmac = async (key, message) => {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(message)));
};

export const sesSmtpPassword = async (secret, region) => {
  let sig = await hmac(new TextEncoder().encode(`AWS4${secret.trim()}`), '11111111');
  for (const part of [region, 'ses', 'aws4_request', 'SendRawEmail']) sig = await hmac(sig, part);
  const bytes = new Uint8Array([0x04, ...sig]);
  return btoa(String.fromCharCode(...bytes));
};
