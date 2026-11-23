// Change history in plain words (#78). An entry is a row of api.change_log
// (or api.deleted_record): which row of which table changed, how, and its
// values before and after, with `names` holding the names for the ids in
// them, keyed column:value.

const TABLES = {
  song: 'Song',
  song_title: 'Alt title',
  song_registration: 'Registration',
  song_writer: 'Writer',
  song_publisher: 'Publisher',
  song_document: 'Document',
  recording: 'Recording',
  recording_artist: 'Artist',
  recording_credit: 'Credit',
  recording_credit_role: 'Credit role',
  recording_credit_instrument: 'Credit instrument',
  recording_owner: 'Master owner',
  recording_representation: 'Representation',
  recording_isrc: 'Other ISRC',
  recording_song: 'Song',
  recording_genre: 'Genre',
  recording_mood: 'Mood',
  recording_theme: 'Theme',
  recording_document: 'Document',
  audio_file: 'Audio file',
  release: 'Release',
  release_artist: 'Artist',
  release_track: 'Track',
  release_distribution: 'Distribution',
  release_document: 'Document',
  contact: 'Person',
  contact_email: 'Email',
  contact_phone: 'Phone',
  contact_organization: 'Company',
  contact_document: 'Document',
  organization: 'Company',
  organization_document: 'Document',
  artist: 'Artist',
  artist_member: 'Member',
};

const FIELDS = {
  contact_id: 'Person',
  organization_id: 'Company',
  claimant_contact_id: 'Claimant',
  claimant_organization_id: 'Claimant',
  pitch_contact_id: 'Pitch contact',
  c_line_contact_id: 'C line',
  c_line_organization_id: 'C line',
  label_id: 'Label',
  distributor_id: 'Distributor',
  for_writer_id: 'For writer',
  pro_code: 'Society',
  member_ipi: 'IPI',
  isni: 'ISNI',
  iswc: 'ISWC',
  isrc: 'ISRC',
  upc: 'UPC',
  bpm: 'BPM',
  public_domain_p: 'Public domain',
  derived_from_id: 'Derived from',
  duration_ms: 'Duration (ms)',
  p_line_year: 'P line year',
  c_line_year: 'C line year',
  status_id: 'Status',
  vocal_type_id: 'Vocals',
  file_type_id: 'File type',
  primary_genre_id: 'Genre',
  recorded_country: 'Recorded in',
  commissioned_country: 'Commissioned in',
  performed_country: 'Performed in',
  language_code: 'Language',
  credited_as: 'Credited as',
  featured_share: 'Featured share',
  is_cover: 'Cover',
  is_instrumental: 'Instrumental',
  is_primary: 'Primary',
  is_exclusive: 'Exclusive',
  storage_uri: 'Location',
};

// The row's own id and its link to the record add nothing a reader needs.
const hidden = (key, recordType) =>
  key === 'id' || key === 'credit_id' || key === `${recordType}_id`;

export const tableLabel = (table) => TABLES[table] ?? table;

export const fieldLabel = (key) => FIELDS[key] ?? (
  key.replace(/_id$/, '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
);

const LIMIT = 120;

export const valueText = (key, value, names = {}) => {
  if (value === null || value === undefined || value === '') return 'blank';
  const name = names[`${key}:${value}`];
  if (name) return name;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'blank';
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 'blank';
  return text.length > LIMIT ? `${text.slice(0, LIMIT - 1)}…` : text;
};

const valueLines = (values, recordType, names) => Object.entries(values ?? {})
  .filter(([key]) => !hidden(key, recordType))
  .map(([key, value]) => `${fieldLabel(key)}: ${valueText(key, value, names)}`);

// { subject: 'Writer Jane Example', action: 'changed', lines: ['Share: 25 → 26'] }
export const describeChange = (entry) => {
  const own = entry.table_name === entry.record_type;
  const names = entry.names ?? {};
  const subject = own
    ? tableLabel(entry.table_name)
    : [tableLabel(entry.table_name), entry.row_label].filter(Boolean).join(' ');
  if (entry.op === 'update') {
    const lines = Object.keys(entry.new_values ?? entry.old_values ?? {})
      .filter((key) => !hidden(key, entry.record_type))
      .map((key) => `${fieldLabel(key)}: ${valueText(key, entry.old_values?.[key], names)}`
        + ` → ${valueText(key, entry.new_values?.[key], names)}`);
    return { subject, action: 'changed', lines };
  }
  if (entry.op === 'insert') {
    return {
      subject,
      action: own ? 'created' : 'added',
      lines: valueLines(entry.new_values, entry.record_type, names),
    };
  }
  return {
    subject,
    action: own ? 'deleted' : 'removed',
    lines: valueLines(entry.old_values, entry.record_type, names),
  };
};

// Entries newest first, grouped by the save (transaction) that made them.
export const groupChanges = (entries) => entries.reduce((groups, entry) => {
  const last = groups[groups.length - 1];
  if (last && last.change_set === entry.change_set) {
    last.entries.push(entry);
  } else {
    groups.push({
      change_set: entry.change_set,
      changed_at: entry.changed_at,
      changed_by: entry.changed_by,
      entries: [entry],
    });
  }
  return groups;
}, []);
