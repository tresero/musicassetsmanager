import { useState } from 'react';
import { useGetList, useArrayInput, useNotify } from 'react-admin';
import { useWatch } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';

// The save rewrites an attached document from the row's fields, so the row
// must carry every one of them; a missing field would blank that value on
// the document everywhere it is attached.
const FIELDS = [
  'id', 'title', 'document_type_id', 'storage_kind', 'storage_uri',
  'mime_type', 'byte_size', 'document_date', 'signed_on', 'expires_on', 'notes',
];

/*
 * Attach a document that already exists, such as a copyright registration
 * or collaboration agreement covering several works, instead of uploading
 * another copy. It joins this record's list as a row; saving links it.
 * Must sit inside the ArrayInput for documents.
 */
export const AttachDocumentInput = () => {
  const { append } = useArrayInput();
  const current = useWatch({ name: 'documents' }) || [];
  const notify = useNotify();
  const [query, setQuery] = useState('');

  const { data = [], isPending } = useGetList('document', {
    pagination: { page: 1, perPage: 500 },
    sort: { field: 'title', order: 'ASC' },
    filter: query ? { 'title@ilike': `*${query}*` } : {},
  });

  const attached = new Set(current.map((d) => d?.id).filter(Boolean));
  const options = data.filter((d) => !attached.has(d.id));

  return (
    <Autocomplete
      options={options}
      loading={isPending}
      value={null}
      blurOnSelect
      clearOnBlur
      filterOptions={(o) => o}
      getOptionLabel={(o) => o?.title || ''}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onInputChange={(_, value, reason) => { if (reason === 'input') setQuery(value); }}
      onChange={(_, doc) => {
        if (!doc) return;
        append(Object.fromEntries(FIELDS.map((k) => [k, doc[k] ?? null])));
        notify(`Attached "${doc.title}". Save to keep it.`, { type: 'info' });
        setQuery('');
      }}
      renderInput={(params) => (
        <TextField {...params} label="Attach an existing document"
                   helperText="Search by title. One document can be attached to any number of songs, recordings, people, and companies." />
      )}
      sx={{ width: { xs: '100%', md: 520 }, mb: 2 }}
    />
  );
};
