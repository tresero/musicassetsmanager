// Rules for emailing documents from a record (#70). The upload service sends
// the email; these decide what the dialog offers and fills in.

// A recipient as the mail header writes it: the name quoted, so a comma or
// accent in it is kept as part of the name.
export const mailbox = (name, email) => {
  const n = (name || '').trim();
  if (!n) return email;
  return `"${n.replace(/["\\]/g, '\\$&')}" <${email}>`;
};

// Addresses typed or pasted together, split on commas, semicolons and line breaks.
export const typedAddresses = (text) =>
  (text || '').split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);

const isWebAddress = (uri) => /^https?:\/\//i.test(uri || '');

// A saved document whose file is in the account's storage can be attached.
// A document kept at a web address is sent as a link instead.
export const attachable = (doc) =>
  doc?.id != null && ['s3', 'local'].includes(doc.storage_kind)
  && !!doc.storage_uri && !isWebAddress(doc.storage_uri);

export const linkLines = (docs) =>
  docs.filter((d) => isWebAddress(d.storage_uri))
    .map((d) => `${d.title}: ${d.storage_uri}`)
    .join('\n');

export const defaultSubject = (recordTitle, docs) => {
  const titles = docs.map((d) => d.title).filter(Boolean).join(', ');
  if (!recordTitle) return titles;
  if (!titles || titles === recordTitle) return recordTitle;
  return `${recordTitle}: ${titles}`;
};

// A logged address as people read it: the header's quotes around the name removed.
export const shownAddress = (address) => {
  const m = /^"((?:[^"\\]|\\.)*)"\s*(<[^>]*>)$/.exec(address || '');
  return m ? `${m[1].replace(/\\(.)/g, '$1')} ${m[2]}` : address;
};
