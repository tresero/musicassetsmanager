import {
  TextInput, SelectInput, ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { Box, Stack } from '@mui/material';
import { derivationTypes } from '../../vocab';
import { CopyrightInputs } from '../../shared';

const CopyrightFields = () => (
  <Stack spacing={2} sx={{ width: '100%', maxWidth: 1100 }}>
    <CopyrightInputs numberHelp="The composition's registration, such as a US PA number" />

    <TextInput source="based_on" label="Based on" fullWidth
               helperText="A source not in this catalog, e.g. America the Beautiful (Bates/Ward, PD)" />

    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <ReferenceInput source="derived_from_id" reference="song" perPage={500}
                      sort={{ field: 'title', order: 'ASC' }}>
        <AutocompleteInput optionText="title" label="Derived from"
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