import {
  TextInput, BooleanInput, ReferenceInput, AutocompleteInput, useRecordContext,
} from 'react-admin';
import { useFormState } from 'react-hook-form';
import { Box, Stack, Typography } from '@mui/material';
import { byName } from '../../vocab';

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
      <TextInput source="iswc" label="ISWC" helperText={false}
                 sx={{ width: { xs: '100%', md: 200 } }} />
      <ReferenceInput source="language_code" reference="language" perPage={300}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Language"
                           filterToQuery={byName} helperText={false}
                           sx={{ width: { xs: '100%', md: 240 } }} />
      </ReferenceInput>
    </Box>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      <BooleanInput source="easy_clear" label="Easy clear" helperText={false} />
      <BooleanInput source="public_domain_p" label="Public domain" helperText={false} />
    </Box>
  </Stack>
);

export default DetailsFields;
