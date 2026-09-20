import {
  TextInput, BooleanInput, ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { Box, Stack } from '@mui/material';
import { byName } from '../../vocab';

const DetailsFields = () => (
  <Stack spacing={2} sx={{ width: '100%', maxWidth: 1100 }}>
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <TextInput source="title" required helperText={false} sx={{ width: 420 }} />
      <TextInput source="iswc" label="ISWC" helperText={false} sx={{ width: 180 }} />
      <ReferenceInput source="language_code" reference="language" perPage={300}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Language"
                           filterToQuery={byName} helperText={false}
                           sx={{ width: 220 }} />
      </ReferenceInput>
    </Box>

    <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <BooleanInput source="exclusive_p" label="Exclusive" helperText={false} />
      <BooleanInput source="one_stop_p" label="One stop" helperText={false} />
      <BooleanInput source="public_domain_p" label="Public domain" helperText={false} />
    </Box>
  </Stack>
);

export default DetailsFields;