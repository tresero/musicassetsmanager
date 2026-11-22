import { describe, expect, test } from 'vitest';
import { compactCode, iswcValid, isrcValid, gtinValid, isniValid, ipiValid } from './codes';

// The same codes as the database's music.iswc_valid and music.gtin_valid.
describe('codes', () => {
  test('compactCode drops separators and uppercases', () => {
    expect(compactCode('t-034.524.680-1')).toBe('T0345246801');
    expect(compactCode(' us-abc-24-00001 ')).toBe('USABC2400001');
    expect(compactCode(null)).toBe('');
  });

  test('ISWC check digit', () => {
    expect(iswcValid('T0345246801')).toBe(true);
    expect(iswcValid('T0345246802')).toBe(false);
    expect(iswcValid('T034524680')).toBe(false);
    expect(iswcValid('0345246801')).toBe(false);
  });

  test('ISRC format, no check digit', () => {
    expect(isrcValid('USABC2400001')).toBe(true);
    expect(isrcValid('US1232400001')).toBe(true);
    expect(isrcValid('USABC240001')).toBe(false);
    expect(isrcValid('U1ABC2400001')).toBe(false);
  });

  test('UPC and EAN check digit', () => {
    expect(gtinValid('196925431217')).toBe(true);
    expect(gtinValid('196925431218')).toBe(false);
    expect(gtinValid('4006381333931')).toBe(true);
    expect(gtinValid('19692543121')).toBe(false);
  });

  test('ISNI and IPI format', () => {
    expect(isniValid('000000036189600X')).toBe(true);
    expect(isniValid('00000003618960')).toBe(false);
    expect(ipiValid('00052210040')).toBe(true);
    expect(ipiValid('1234567')).toBe(false);
  });
});
