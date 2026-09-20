import {
  TextInput, NumberInput, DateInput, SelectInput,
  ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { Box, Stack } from '@mui/material';
import { derivationTypes, byTitle } from '../../vocab';

const CopyrightFields = () => (
  <Stack spacing={2} sx={{ width: '100%', maxWidth: 1100 }}>
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <DateInput source="copyright_date" label="Copyright date"
                 helperText={false} sx={{ width: 190 }} />
      <TextInput source="copyright_number" label="Copyright number"
                 helperText={false} sx={{ width: 240 }} />
      <DateInput source="reversion_date" label="Reversion date"
                 helperText={false} sx={{ width: 190 }} />
      <NumberInput source="reversion_lead" label="Lead (years)"
                   helperText={false} sx={{ width: 140 }} />
    </Box>

    <TextInput source="based_on" label="Based on" fullWidth
               helperText="A source not in this catalog, e.g. America the Beautiful (Bates/Ward, PD)" />

    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <ReferenceInput source="derived_from_id" reference="song" perPage={500}
                      sort={{ field: 'title', order: 'ASC' }}>
        <AutocompleteInput optionText="title" label="Derived from"
                           filterToQuery={byTitle}
                           helperText="Only when the source is in this catalog"
                           sx={{ width: 340 }} />
      </ReferenceInput>
      <SelectInput source="derivation_type" choices={derivationTypes}
                   label="Derivation type"
                   helperText="Only when new authorship exists"
                   sx={{ width: 220 }} />
    </Box>
  </Stack>
);

export default CopyrightFields;