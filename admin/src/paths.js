// Records are addressed by name (#60): /song/agarra-lo-tuyo rather than
// /song/52. The database keeps each record's slug; a number still works,
// and so does a name the record had before it was renamed.

// The catalog records that have a slug.
export const SLUGGED = new Set(['song', 'recording', 'release', 'contact', 'organization', 'artist', 'document']);

// An id from the address that is a name rather than a number.
export const isSlug = (id) => typeof id === 'string' && id !== '' && !/^[0-9]+$/.test(id);

// Where a list row opens.
export const slugPath = (resource, record) => `/${resource}/${record.slug ?? record.id}`;

// The address a record's page should have, when the one it was opened at
// (by number, or by an old name) differs; null when it is already right.
export const prettyPath = (pathname, resource, slug) => {
  if (!slug) return null;
  const [, first, current, ...rest] = pathname.split('/');
  if (first !== resource || current === undefined || current === 'create') return null;
  if (decodeURIComponent(current) === slug) return null;
  return ['', resource, slug, ...rest].join('/');
};
