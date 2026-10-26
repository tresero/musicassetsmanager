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

// Search boxes and pickers send React Admin's q filter. Each typed word must
// start a word in the view's search value; the database folds case and
// accents on both sides (api.fold), so corazon finds Corazón.
const searchQuery = (q) =>
  q.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map((w) => `${w}:*`).join(' & ');

// Searches saved in the browser under these keys would filter the list
// invisibly, since no input shows them any more.
const OLD_SEARCH_KEYS = ['title@ilike', 'name@ilike', 'sort_name@ilike', 'search@ilike'];

const toSearch = (params) => {
  if (!params?.filter) return params;
  const { q, ...filter } = params.filter;
  OLD_SEARCH_KEYS.forEach((key) => delete filter[key]);
  const query = typeof q === 'string' ? searchQuery(q) : '';
  if (query) filter['search@fts(fold)'] = query;
  return { ...params, filter };
};

export default {
  ...provider,
  getList: (resource, params) => provider.getList(resource, toSearch(params)),
  getManyReference: (resource, params) =>
    provider.getManyReference(resource, toSearch(params)),
};
