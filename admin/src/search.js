import { compactCode } from './codes';

// Search boxes and pickers send React Admin's q filter. Each typed word must
// start a word in the view's search value; the database folds case and
// accents on both sides (api.fold), so corazon finds Corazón.
//
// Codes are indexed compact (T0345246801, USABC2400001), so a word typed with
// dashes or dots that holds a digit, like T-034.524.680-1, matches either its
// compact form or its separate parts. A query that is only digits and
// separators, like a UPC typed in groups, is also tried as one number.
const words = (s) => s.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map((w) => `${w}:*`);
const either = (code, parts) => `(${code}:* | ${parts.join(' & ')})`;

const term = (word) => {
  const parts = words(word);
  const code = compactCode(word);
  return parts.length > 1 && /[0-9]/.test(code) && code.length >= 5
    ? either(code, parts) : parts.join(' & ');
};

export const searchQuery = (q) => {
  const digits = q.replace(/[\s./-]/g, '');
  if (/^[0-9]{8,14}$/.test(digits) && /[\s./-]/.test(q.trim())) return either(digits, words(q));
  return q.split(/\s+/).map(term).filter(Boolean).join(' & ');
};

// Text filters searched in full text: the search box (q) against a record's
// search column, and Lyrics contain (#48) against its lyrics_search column.
const TEXT_SEARCHES = { q: 'search', lyrics: 'lyrics_search' };

export const searchFilters = (filter) => Object.entries(filter).reduce((out, [key, value]) => {
  const column = TEXT_SEARCHES[key];
  if (!column) return { ...out, [key]: value };
  const query = typeof value === 'string' ? searchQuery(value.trim()) : '';
  return query ? { ...out, [`${column}@fts(fold)`]: query } : out;
}, {});

// Lyrics contain found nothing exactly: search again with the close words
// the database suggested (api.lyrics_close_query) in place of what was typed.
export const withCloseLyrics = (filter, closeQuery) => {
  const { lyrics, ...rest } = filter;
  return { ...searchFilters(rest), 'lyrics_search@fts(fold)': closeQuery };
};
