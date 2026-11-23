// A recording's audio files come in three lists (#43): mixes and cuts on the
// Audio tab, and stems and multitrack tracks on tabs of their own.
export const AUDIO_LISTS = ['audio_files', 'stem_files', 'multitrack_files'];

// A track dropped among many is named from its file name, without the
// extension, underscores read as spaces.
export const trackTitle = (fileName) => {
  const dot = fileName.lastIndexOf('.');
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  return base.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
};

// Which row of which list already holds the stored file, if any.
export const findStored = (values, key) => {
  for (const list of AUDIO_LISTS) {
    const index = (values[list] || []).findIndex((r) => r?.storage_uri === key);
    if (index >= 0) return { list, index, row: values[list][index] };
  }
  return null;
};

// A file's size in words: 1.2 GB, 340 MB, 96 KB.
export const sizeText = (bytes) => {
  const n = Number(bytes);
  if (!n) return null;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${Math.round(n / 1e6)} MB`;
  return `${Math.max(1, Math.round(n / 1e3))} KB`;
};
