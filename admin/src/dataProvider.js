import { fetchUtils } from 'react-admin';
import postgrestRestProvider, { defaultSchema } from '@raphiniert/ra-data-postgrest';
import { searchFilters, withCloseLyrics } from './search';
import { explainDbError } from './dbErrors';
import { trimText } from './trim';

const httpClient = (url, options = {}) => {
  if (!options.headers) options.headers = new Headers({ Accept: 'application/json' });
  const token = localStorage.getItem('token');
  if (token) options.headers.set('Authorization', `Bearer ${token}`);
  return fetchUtils.fetchJson(url, options);
};

const provider = postgrestRestProvider({
  apiUrl: '/api',
  httpClient,
  defaultListOp: 'eq',
  primaryKeys: new Map([
    ['country', ['code']],
    ['pro', ['code']],
    ['pro_territory', ['pro_code', 'country_code']],
    ['key_signature', ['name']],
    ['vocabulary', ['prefix']],
    ['language', ['code']],
    ['email_duplicate', ['email']],
        ['contact_organization', ['contact_id', 'organization_id']],
    ['artist_member', ['artist_id', 'contact_id']],
    ['account_storage', ['account_id']],
  ]),
  schema: defaultSchema,
});

// Searches and filters saved in the browser under these keys would filter
// the list invisibly, since no input shows them any more. Unmatched
// statement lines are now match_method@is, since a line marked not in catalog
// has no song either.
const OLD_SEARCH_KEYS = ['title@ilike', 'name@ilike', 'sort_name@ilike', 'search@ilike', 'song_id@is'];

const withoutOldKeys = (filter) => {
  const kept = { ...filter };
  OLD_SEARCH_KEYS.forEach((key) => delete kept[key]);
  return kept;
};

const toSearch = (params) => {
  if (!params?.filter) return params;
  return { ...params, filter: searchFilters(withoutOldKeys(params.filter)) };
};

// When Lyrics contain matches nothing, the database rewrites the typed words
// to the closest words in the account's lyrics, and the list is searched
// again with them; meta.closeLyrics says which words, for the notice.
const closeLyricsQuery = (typed) =>
  httpClient('/api/rpc/lyrics_close_query', { method: 'POST', body: JSON.stringify({ q: typed }) })
    .then(({ json }) => json)
    .catch(() => null);

const getList = async (resource, params) => {
  const result = await provider.getList(resource, toSearch(params));
  const typed = params?.filter?.lyrics;
  if (result.total !== 0 || typeof typed !== 'string' || !typed.trim()) return result;
  const close = await closeLyricsQuery(typed.trim());
  if (!close?.query) return result;
  const found = await provider.getList(resource, {
    ...params, filter: withCloseLyrics(withoutOldKeys(params.filter), close.query),
  });
  return { ...found, meta: { ...found.meta, closeLyrics: close.words } };
};

// Every save trims its text first (trim.js), and a save the database
// refuses marks the field it is about (dbErrors.js).
const explained = (method) => (resource, params) =>
  provider[method](resource, { ...params, data: trimText(params.data) })
    .catch((error) => { throw explainDbError(resource, error); });

export default {
  ...provider,
  getList,
  getManyReference: (resource, params) =>
    provider.getManyReference(resource, toSearch(params)),
  create: explained('create'),
  update: explained('update'),
  updateMany: explained('updateMany'),
};
