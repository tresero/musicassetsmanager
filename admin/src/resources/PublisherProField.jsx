import { useWatch } from 'react-hook-form';
import { useGetOne } from 'react-admin';
import { useSourceContext } from 'ra-core';
import { TextField } from '@mui/material';

/*
 * Read-only PRO of the selected publisher. Comes from the company or
 * person record, so it cannot drift from what is on file.
 */
export const PublisherProField = () => {
  const sourceCtx = useSourceContext();
  const path = (f) => (sourceCtx ? sourceCtx.getSource(f) : f);
  const orgId = useWatch({ name: path('organization_id') });
  const contactId = useWatch({ name: path('contact_id') });
  const [resource, id] = orgId ? ['organization', orgId] : ['contact', contactId];

  const { data: party } = useGetOne(
    resource,
    { id },
    { enabled: !!id }
  );

  return (
    <TextField
      label="PRO"
      value={party?.pro_code ?? ''}
      placeholder={id ? 'none on file' : ''}
      variant="standard"
      slotProps={{
        input: { readOnly: true, disableUnderline: true },
      }}
      sx={{ width: 110 }}
    />
  );
};
