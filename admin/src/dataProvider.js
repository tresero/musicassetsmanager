import { fetchUtils } from 'react-admin';
import postgrestRestProvider, { defaultSchema } from '@raphiniert/ra-data-postgrest';

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

// The api views' search value is lowercased without accents (music.fold), so
// the typed text is folded the same way: corazón, Corazon and CORAZÓN all
// find Corazón.
const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Searches before #21 were saved in the browser under these keys. No input
// shows them any more, so a saved one would filter the list invisibly.
const OLD_SEARCH_KEYS = ['title@ilike', 'name@ilike', 'sort_name@ilike'];

const foldSearch = (params) => {
  if (!params?.filter) return params;
  const filter = { ...params.filter };
  OLD_SEARCH_KEYS.forEach((key) => delete filter[key]);
  const value = filter['search@ilike'];
  if (typeof value === 'string') filter['search@ilike'] = fold(value);
  return { ...params, filter };
};

export default {
  ...provider,
  getList: (resource, params) => provider.getList(resource, foldSearch(params)),
  getManyReference: (resource, params) =>
    provider.getManyReference(resource, foldSearch(params)),
};
