import { useWatch } from 'react-hook-form';
import { useGetOne } from 'react-admin';
import { useSourceContext } from 'ra-core';
import { TextField } from '@mui/material';

/*
 * Read-only PRO of the selected publisher. Comes from the organization
 * record, so it cannot drift from what is on file.
 */
export const PublisherProField = () => {
  const sourceCtx = useSourceContext();
  const path = (f) => (sourceCtx ? sourceCtx.getSource(f) : f);
  const orgId = useWatch({ name: path('organization_id') });

  const { data: org } = useGetOne(
    'organization',
    { id: orgId },
    { enabled: !!orgId }
  );

  return (
    <TextField
      label="PRO"
      value={org?.pro_code ?? ''}
      placeholder={orgId ? 'none on file' : ''}
      variant="standard"
      slotProps={{
        input: { readOnly: true, disableUnderline: true },
      }}
      sx={{ width: 110 }}
    />
  );
};