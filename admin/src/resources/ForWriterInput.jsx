import { useWatch, useFormContext } from 'react-hook-form';
import { useGetMany } from 'react-admin';
import { useSourceContext } from 'ra-core';
import { TextField, MenuItem } from '@mui/material';

/*
 * Picks which writer on THIS song a publisher share is for.
 *
 * The options are the writers in the sibling `writers` array, not a
 * reference lookup, so it only ever offers people actually credited on
 * the work. Writer rows that have not been saved yet have no id and are
 * skipped, since a publisher cannot point at a row that does not exist.
 */
export const ForWriterInput = () => {
  const sourceCtx = useSourceContext();
  const { setValue } = useFormContext();

  const path = (f) => (sourceCtx ? sourceCtx.getSource(f) : f);
  const value = useWatch({ name: path('for_writer_id') }) ?? '';
  const writers = useWatch({ name: 'writers' }) || [];

  const saved = writers.filter((w) => w && w.id && w.contact_id);
  const contactIds = saved.map((w) => w.contact_id);

  const { data: contacts = [] } = useGetMany(
    'contact',
    { ids: contactIds },
    { enabled: contactIds.length > 0 }
  );

  const nameFor = (contactId) => {
    const c = contacts.find((x) => x.id === contactId);
    return c ? c.display_name : `contact ${contactId}`;
  };

  return (
    <TextField
      select
      label="For writer"
      value={value}
      onChange={(e) =>
        setValue(path('for_writer_id'),
          e.target.value === '' ? null : Number(e.target.value),
          { shouldDirty: true })}
      sx={{ minWidth: 220 }}
      helperText={saved.length === 0 ? 'Save the writers first' : false}
    >
      <MenuItem value="">
        <em>Not specified</em>
      </MenuItem>
      {saved.map((w) => (
        <MenuItem key={w.id} value={w.id}>
          {nameFor(w.contact_id)}
          {w.share ? ` (${Number(w.share)}%)` : ''}
        </MenuItem>
      ))}
    </TextField>
  );
};
