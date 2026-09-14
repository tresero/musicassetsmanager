import { fetchUtils } from 'react-admin';
import postgrestRestProvider, { defaultSchema } from '@raphiniert/ra-data-postgrest';

const httpClient = (url, options = {}) => {
  if (!options.headers) options.headers = new Headers({ Accept: 'application/json' });
  const token = localStorage.getItem('token');
  if (token) options.headers.set('Authorization', `Bearer ${token}`);
  return fetchUtils.fetchJson(url, options);
};

export default postgrestRestProvider({
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