import { describe, expect, test } from 'vitest';
import { searchQuery, searchFilters, withCloseLyrics } from './search';

describe('searchQuery', () => {
  test('plain words each match the start of a word', () => {
    expect(searchQuery('smi cora')).toBe('smi:* & cora:*');
    expect(searchQuery('Corazón')).toBe('Corazón:*');
  });

  test('a code with dashes and dots matches it compact or in parts', () => {
    expect(searchQuery('T-034.524.680-1'))
      .toBe('(T0345246801:* | T:* & 034:* & 524:* & 680:* & 1:*)');
    expect(searchQuery('us-abc-24-00001'))
      .toBe('(USABC2400001:* | us:* & abc:* & 24:* & 00001:*)');
  });

  test('a UPC typed in groups is also tried as one number', () => {
    expect(searchQuery('1 96925 43121 7'))
      .toBe('(196925431217:* | 1:* & 96925:* & 43121:* & 7:*)');
  });

  test('a code next to a word', () => {
    expect(searchQuery('love T-034.524.680-1'))
      .toBe('love:* & (T0345246801:* | T:* & 034:* & 524:* & 680:* & 1:*)');
  });

  test('a hyphenated word without digits is left as words', () => {
    expect(searchQuery('hip-hop')).toBe('hip:* & hop:*');
  });
});

describe('searchFilters', () => {
  test('the search box and Lyrics contain become full text searches', () => {
    expect(searchFilters({ q: 'smi cora', lyrics: 'bajo la luna', one_stop: true })).toEqual({
      'search@fts(fold)': 'smi:* & cora:*',
      'lyrics_search@fts(fold)': 'bajo:* & la:* & luna:*',
      one_stop: true,
    });
  });

  test('empty text adds no search', () => {
    expect(searchFilters({ q: '  ', lyrics: '' })).toEqual({});
    expect(searchFilters({})).toEqual({});
  });
});

describe('withCloseLyrics', () => {
  test('searches the close words in place of what was typed, keeping other filters', () => {
    expect(withCloseLyrics({ q: 'son', lyrics: 'korazon', one_stop: true }, '(corazon | corazones)')).toEqual({
      'search@fts(fold)': 'son:*',
      'lyrics_search@fts(fold)': '(corazon | corazones)',
      one_stop: true,
    });
  });
});
