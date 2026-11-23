import { describe, expect, test } from 'vitest';
import { describeChange, groupChanges, valueText, fieldLabel } from './changes';

// Made-up records; the shapes are api.change_log's.
const writerShare = {
  change_set: '901', changed_at: '2026-11-23T15:00:00Z', changed_by: 'editor@example.com',
  record_type: 'song', record_id: 7, record_label: 'Example Song',
  table_name: 'song_writer', row_label: 'Jane Example', op: 'update',
  old_values: { share: 25 }, new_values: { share: 26 }, names: {},
};

describe('changes', () => {
  test('an update lists each changed field, before and after', () => {
    expect(describeChange(writerShare)).toEqual({
      subject: 'Writer Jane Example', action: 'changed', lines: ['Share: 25 → 26'],
    });
  });

  test('ids show as the names stored with the entry', () => {
    const entry = {
      ...writerShare, op: 'insert', old_values: null,
      new_values: { id: 3, song_id: 7, contact_id: 12, role_id: 5, share: 50, controlled: true },
      names: { 'contact_id:12': 'Jane Example', 'role_id:5': 'Composer', 'song_id:7': 'Example Song' },
    };
    expect(describeChange(entry)).toEqual({
      subject: 'Writer Jane Example',
      action: 'added',
      lines: ['Person: Jane Example', 'Role: Composer', 'Share: 50', 'Controlled: yes'],
    });
  });

  test('the record itself is created and deleted; child rows are added and removed', () => {
    const song = { ...writerShare, table_name: 'song', row_label: null };
    expect(describeChange({ ...song, op: 'insert', new_values: { id: 7, title: 'Example Song' } }))
      .toEqual({ subject: 'Song', action: 'created', lines: ['Title: Example Song'] });
    expect(describeChange({ ...song, op: 'delete', old_values: { id: 7, title: 'Example Song' } }).action)
      .toBe('deleted');
    expect(describeChange({ ...writerShare, op: 'delete', old_values: { share: 25 } }).action)
      .toBe('removed');
  });

  test('a credit role hides the credit it belongs to', () => {
    const entry = {
      ...writerShare, record_type: 'recording', table_name: 'recording_credit_role',
      op: 'insert', new_values: { credit_id: 4, role_id: 11 }, names: { 'role_id:11': 'Producer' },
    };
    expect(describeChange(entry).lines).toEqual(['Role: Producer']);
  });

  test('values in words', () => {
    expect(valueText('notes', null)).toBe('blank');
    expect(valueText('notes', '<p>Cut in <b>one</b> take</p>')).toBe('Cut in one take');
    expect(valueText('easy_clear', false)).toBe('no');
    expect(valueText('lyrics', 'la '.repeat(100))).toHaveLength(120);
    expect(fieldLabel('performed_country')).toBe('Performed in');
    expect(fieldLabel('catalog_number')).toBe('Catalog number');
    expect(fieldLabel('genre_id')).toBe('Genre');
  });

  test('entries group by the save that made them', () => {
    const groups = groupChanges([
      { ...writerShare, id: 3 },
      { ...writerShare, id: 2 },
      { ...writerShare, id: 1, change_set: '900', changed_by: 'Outside the app' },
    ]);
    expect(groups.map((g) => [g.change_set, g.entries.length, g.changed_by]))
      .toEqual([['901', 2, 'editor@example.com'], ['900', 1, 'Outside the app']]);
  });
});
