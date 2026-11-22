import { describe, expect, test } from 'vitest';
import { HttpError } from 'react-admin';
import { explainDbError } from './dbErrors';
import { CODE_MESSAGES as M } from './codes';

// What ra-data-postgrest throws for a refused save: PostgREST's JSON as body.
const refused = (message, code = '23514') =>
  new HttpError(message, 400, { code, message, details: null, hint: null });

describe('explainDbError', () => {
  test('a code constraint marks its field with the form check wording', () => {
    const e = explainDbError('song',
      refused('value for domain music.iswc violates check constraint "iswc_check_digit"'));
    expect(e.message).toBe(M.iswcDigit);
    expect(e.status).toBe(400);
    expect(e.body.errors).toEqual({ iswc: M.iswcDigit });
  });

  test('a duplicate marks the field', () => {
    const e = explainDbError('recording',
      refused('duplicate key value violates unique constraint "recording_isrc_key"', '23505'));
    expect(e.body.errors).toEqual({ isrc: 'Another recording already has this ISRC' });
  });

  test('the field can differ by resource', () => {
    const msg = 'value for domain music.isni_number violates check constraint "isni_format"';
    expect(explainDbError('artist', refused(msg)).body.errors).toEqual({ isni_own: M.isniShape });
    expect(explainDbError('contact', refused(msg)).body.errors).toEqual({ isni: M.isniShape });
  });

  test('a constraint with no field gets the plain message only', () => {
    const e = explainDbError('release',
      refused('new row for relation "release_distribution" violates check constraint "release_distribution_upc_valid"'));
    expect(e.message).toMatch(/distributor's UPC/);
    expect(e.body.errors).toBeUndefined();
  });

  test('anything else is passed through unchanged', () => {
    const original = refused('Only the site admin can change the roles', 'P0001');
    expect(explainDbError('account_role', original)).toBe(original);
  });
});
