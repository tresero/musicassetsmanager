import { describe, expect, test } from 'vitest';
import { attachable, defaultSubject, linkLines, mailbox, shownAddress, typedAddresses } from './mail';

describe('mail', () => {
  test('a recipient is written with their name, quoted', () => {
    expect(mailbox('Ada Example', 'ada@example.com')).toBe('"Ada Example" <ada@example.com>');
    expect(mailbox('Ada "The Pen" Example', 'ada@example.com'))
      .toBe('"Ada \\"The Pen\\" Example" <ada@example.com>');
    expect(mailbox('', 'ada@example.com')).toBe('ada@example.com');
    expect(mailbox(null, 'ada@example.com')).toBe('ada@example.com');
  });

  test('a logged recipient is shown without the header quoting', () => {
    expect(shownAddress('"Ada Example" <ada@example.com>')).toBe('Ada Example <ada@example.com>');
    expect(shownAddress('"Ada \\"The Pen\\" Example" <ada@example.com>')).toBe('Ada "The Pen" Example <ada@example.com>');
    expect(shownAddress('ada@example.com')).toBe('ada@example.com');
  });

  test('addresses pasted together are split apart', () => {
    expect(typedAddresses('a@example.com, b@example.com; c@example.com\nd@example.com'))
      .toEqual(['a@example.com', 'b@example.com', 'c@example.com', 'd@example.com']);
    expect(typedAddresses('  ')).toEqual([]);
  });

  test('a stored file is attached; a web address goes in the message as a link', () => {
    expect(attachable({ id: 1, storage_kind: 's3', storage_uri: 'documents/abc.pdf' })).toBe(true);
    expect(attachable({ id: 1, storage_kind: 'local', storage_uri: 'documents/abc.pdf' })).toBe(true);
    expect(attachable({ id: 1, storage_kind: 'url', storage_uri: 'https://example.com/a.pdf' })).toBe(false);
    expect(attachable({ id: 1, storage_kind: 's3', storage_uri: 'https://example.com/a.pdf' })).toBe(false);
    expect(attachable({ storage_kind: 's3', storage_uri: 'documents/abc.pdf' })).toBe(false);
    expect(attachable({ id: 1, storage_kind: 's3', storage_uri: '' })).toBe(false);
    expect(linkLines([
      { title: 'Split Sheet', storage_kind: 'url', storage_uri: 'https://example.com/a.pdf' },
      { title: 'Agreement', storage_kind: 's3', storage_uri: 'documents/abc.pdf' },
    ])).toBe('Split Sheet: https://example.com/a.pdf');
  });

  test('the subject names the record and the documents', () => {
    expect(defaultSubject('A Song', [{ title: 'Split Sheet' }])).toBe('A Song: Split Sheet');
    expect(defaultSubject('A Song', [{ title: 'Split Sheet' }, { title: 'Agreement' }]))
      .toBe('A Song: Split Sheet, Agreement');
    expect(defaultSubject('Split Sheet', [{ title: 'Split Sheet' }])).toBe('Split Sheet');
    expect(defaultSubject(undefined, [])).toBe('');
  });
});
