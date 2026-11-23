import {
  TextInput, BooleanInput, useRecordContext,
} from 'react-admin';
import { useFormState } from 'react-hook-form';
import { Box, Stack, Typography } from '@mui/material';
import { LanguageInput } from '../../shared';
import { IswcInput } from '../../codeInputs';

// Computed by the database from the controlled writer and publisher
// shares, so it reflects the last save rather than unsaved edits.
const OneStopStatus = () => {
  const record = useRecordContext();
  const { isDirty } = useFormState();
  if (!record?.id) return null;
  const pending = isDirty ? ' (as of the last save; save to recheck)' : '';
  return record.one_stop
    ? <Typography variant="body2" sx={{ color: 'success.main' }}>One stop{pending}</Typography>
    : <Typography variant="body2" sx={{ color: 'warning.main' }}>
        Not one stop: {record.one_stop_reason}{pending}
      </Typography>;
};

const DetailsFields = () => (
  <Stack spacing={2} sx={{ width: '100%', maxWidth: 1100 }}>
    <OneStopStatus />
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
      <TextInput source="title" required helperText={false}
                 sx={{ width: { xs: '100%', md: 420 } }} />
      <IswcInput helperText="Assigned once the work is registered. Paste it as written."
                 sx={{ width: { xs: '100%', md: 200 } }} />
      <LanguageInput helperText="Of the lyrics; Instrumental for none"
                     sx={{ width: { xs: '100%', md: 240 } }} />
    </Box>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      <BooleanInput source="easy_clear" label="Easy clear"
                    helperText="Set by hand: can be cleared quickly for sync, even when not one stop" />
      <BooleanInput source="public_domain_p" label="Public domain source"
                    helperText="The tune is public domain. With no shares it is free to use; with shares the writers are its arrangers, and one stop follows their shares." />
    </Box>
  </Stack>
);

export default DetailsFields;
