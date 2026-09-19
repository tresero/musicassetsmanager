const list = (...v) => v.map((x) => ({ id: x, name: x }));

export const versionLabels = list(
  'Release','Radio Edit', 'Extended Mix', 'Instrumental', 'A Cappella', 'Acoustic',
  'Live', 'Demo', 'Remix', 'Clean', 'Explicit', 'TV Mix', 'Underscore',
  'Stem Mix', 'Dolby Atmos', 'Remastered', 'Sting',
  '15 Second', '30 Second', '60 Second',
);

export const tempos = list(
  'Very Slow', 'Slow', 'Laid Back', 'Mid-Tempo', 'Steady',
  'Upbeat', 'Driving', 'Fast', 'Very Fast', 'Building', 'Variable',
);

export const derivationTypes = [
  { id: 'arrangement', name: 'Arrangement' },
  { id: 'translation', name: 'Translation' },
  { id: 'adaptation',  name: 'Adaptation' },
  { id: 'sample',      name: 'Sample' },
];

export const titleTypes = [
  { id: 'alternate',  name: 'Alternate' },
  { id: 'translated', name: 'Translated' },
  { id: 'working',    name: 'Working' },
  { id: 'formal',     name: 'Formal' },
  { id: 'part',       name: 'Part' },
];

export const storageKinds = [
  { id: 'local', name: 'Local file' },
  { id: 's3',    name: 'S3 / object storage' },
  { id: 'url',   name: 'URL' },
];

export const freeText = (v) => ({ id: v, name: v });

export const byName     = (q) => ({ 'name@ilike': `*${q}*` });
export const bySortName = (q) => ({ 'sort_name@ilike': `*${q}*` });
export const byTitle    = (q) => ({ 'title@ilike': `*${q}*` });
export const byCode     = (q) => ({ 'code@ilike': `*${q}*` });

export const proOptionText = (r) => (r ? `${r.code} — ${r.name}` : '');
export const proInputText  = (r) => (r ? r.code : '');