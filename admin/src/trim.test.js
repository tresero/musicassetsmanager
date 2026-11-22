import { describe, expect, test } from 'vitest';
import { trimText } from './trim';

describe('trimText', () => {
  test('trims both ends of text, inner spaces kept', () => {
    expect(trimText('  00052210040 \n')).toBe('00052210040');
    expect(trimText(' Con Sabor  al Guauso ')).toBe('Con Sabor  al Guauso');
  });

  test('whitespace only is empty', () => {
    expect(trimText('   ')).toBeNull();
    expect(trimText({ title: ' ' })).toEqual({ title: null });
  });

  test('child rows and lists are trimmed', () => {
    expect(trimText({
      title: ' A ',
      writers: [{ credit_name: ' Ann ', share: 50 }],
      other_isrcs: [' USABC2400001 ', '  '],
    })).toEqual({
      title: 'A',
      writers: [{ credit_name: 'Ann', share: 50 }],
      other_isrcs: ['USABC2400001'],
    });
  });

  test('other values are left alone', () => {
    const file = new Blob(['x']);
    const date = new Date(0);
    expect(trimText(5)).toBe(5);
    expect(trimText(false)).toBe(false);
    expect(trimText(null)).toBeNull();
    expect(trimText(file)).toBe(file);
    expect(trimText(date)).toBe(date);
  });
});
