import { fetchUtils } from 'react-admin';
import postgrestRestProvider, { defaultSchema } from '@raphiniert/ra-data-postgrest';
import { searchFilters } from './search';
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

const toSearch = (params) => {
  if (!params?.filter) return params;
  const filter = { ...params.filter };
  OLD_SEARCH_KEYS.forEach((key) => delete filter[key]);
  return { ...params, filter: searchFilters(filter) };
};

// Every save trims its text first (trim.js), and a save the database
// refuses marks the field it is about (dbErrors.js).
const explained = (method) => (resource, params) =>
  provider[method](resource, { ...params, data: trimText(params.data) })
    .catch((error) => { throw explainDbError(resource, error); });

export default {
  ...provider,
  getList: (resource, params) => provider.getList(resource, toSearch(params)),
  getManyReference: (resource, params) =>
    provider.getManyReference(resource, toSearch(params)),
  create: explained('create'),
  update: explained('update'),
  updateMany: explained('updateMany'),
};
