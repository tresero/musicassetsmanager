import { describe, expect, test } from 'vitest';
import { isSlug, prettyPath, slugPath } from './paths';

describe('paths', () => {
  test('a name in the address is told apart from a number', () => {
    expect(isSlug('agarra-lo-tuyo')).toBe(true);
    expect(isSlug('1999-song')).toBe(true);
    expect(isSlug('52')).toBe(false);
    expect(isSlug(52)).toBe(false);
    expect(isSlug(undefined)).toBe(false);
  });

  test('a record opened by number, or by an old name, moves to its name', () => {
    expect(prettyPath('/song/52', 'song', 'agarra-lo-tuyo')).toBe('/song/agarra-lo-tuyo');
    expect(prettyPath('/song/52/3', 'song', 'agarra-lo-tuyo')).toBe('/song/agarra-lo-tuyo/3');
    expect(prettyPath('/song/old-name/1', 'song', 'new-name')).toBe('/song/new-name/1');
  });

  test('an address already right, another page, or no name stays as it is', () => {
    expect(prettyPath('/song/agarra-lo-tuyo/3', 'song', 'agarra-lo-tuyo')).toBeNull();
    expect(prettyPath('/song/create', 'song', undefined)).toBeNull();
    expect(prettyPath('/recording/28', 'song', 'agarra-lo-tuyo')).toBeNull();
  });

  test('a row opens at its name, or its number when it has none', () => {
    expect(slugPath('song', { id: 52, slug: 'agarra-lo-tuyo' })).toBe('/song/agarra-lo-tuyo');
    expect(slugPath('song', { id: 52 })).toBe('/song/52');
  });
});
