// Industry codes are stored compact: no spaces, dashes or dots, uppercase.
// People paste them formatted, so forms and search compact them first.
export const compactCode = (v) => (v ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');

// ISO 15707: 1 plus each of the nine digits times its position; the check
// digit makes the sum a multiple of 10. Same rule as music.iswc_valid.
export const iswcValid = (v) =>
  /^T[0-9]{10}$/.test(v)
  && (10 - ((1 + [...v.slice(1, 10)].reduce((s, d, i) => s + (i + 1) * Number(d), 0)) % 10)) % 10
     === Number(v[10]);

// ISRC has no check digit: country, registrant, year, five-digit designation.
export const isrcValid = (v) => /^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/.test(v);

// UPC (12) or EAN (13): weights 3 and 1 from the right, before the check
// digit. Same rule as music.gtin_valid.
export const gtinValid = (v) => {
  if (!/^[0-9]{12,13}$/.test(v)) return false;
  let sum = 0;
  for (let i = 1; i < v.length; i += 1) sum += Number(v[v.length - 1 - i]) * (i % 2 === 1 ? 3 : 1);
  return (10 - (sum % 10)) % 10 === Number(v[v.length - 1]);
};

// ISNI, ISO 27729: MOD 11-2 over the first 15 digits, X standing for 10.
// Same rule as music.isni_valid.
export const isniValid = (v) => {
  if (!/^[0-9]{15}[0-9X]$/.test(v)) return false;
  let t = 0;
  for (let i = 0; i < 15; i += 1) t = (t + Number(v[i])) * 2;
  const r = (12 - (t % 11)) % 11;
  return v[15] === (r === 10 ? 'X' : String(r));
};

// IPI name number: padded to 11 digits (shorter ones have lost their leading
// zeros), the first nine weighted 10 down to 2 and summed modulo 101; the
// last two digits are (101 - sum) mod 100, or 00 when the sum is 0. Same
// rule as music.ipi_valid.
export const ipiValid = (v) => {
  if (!/^[0-9]{9,11}$/.test(v)) return false;
  const d = v.padStart(11, '0');
  let s = 0;
  for (let i = 0; i < 9; i += 1) s += Number(d[i]) * (10 - i);
  s %= 101;
  return (s === 0 ? 0 : (101 - s) % 100) === Number(d.slice(9));
};

// One wording for each problem, used by the form checks and for the same
// problem caught by the database (dbErrors.js).
const MISTYPED = "The last digit doesn't match the ones before it, so one of them is probably mistyped";
export const CODE_MESSAGES = {
  iswcShape: 'An ISWC is T and ten digits, like T-034.524.680-1',
  iswcDigit: MISTYPED,
  isrcShape: 'An ISRC is a two-letter country, three letters or digits, and seven digits, like US-ABC-24-00001',
  upcShape: 'A UPC is 12 digits and an EAN 13, like 196925431217',
  upcDigit: MISTYPED,
  isniShape: 'An ISNI is 16 characters: 15 digits, then a digit or X',
  isniDigit: MISTYPED,
  ipiShape: 'An IPI name number is 11 digits; the leading zeros can be left off',
  ipiDigit: "The last two digits don't match the ones before them, so one of them is probably mistyped",
};
