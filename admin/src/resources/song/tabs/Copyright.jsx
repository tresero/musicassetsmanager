import {
  TextInput, NumberInput, DateInput, SelectInput,
  ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { Box, Typography, Divider } from '@mui/material';
import { derivationTypes, byTitle } from '../../vocab';

const Row = ({ children, cols = '1fr 1fr' }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: cols, gap: 2, width: '100%' }}>
    {children}
  </Box>
);

const Heading = ({ children }) => (
  <>
    <Typography variant="overline" color="text.secondary" sx={{ mt: 2 }}>
      {children}
    </Typography>
    <Divider sx={{ mb: 1, width: '100%' }} />
  </>
);

const CopyrightFields = () => (
  <>
    <Heading>Registration</Heading>
    <Row cols="1fr 2fr">
      <DateInput source="copyright_date" label="Copyright date" />
      <TextInput source="copyright_number" label="Copyright number" />
    </Row>

    <Heading>Reversion</Heading>
    <Row>
      <DateInput source="reversion_date" label="Reversion date" />
      <NumberInput source="reversion_lead" label="Lead time (years)" />
    </Row>

    <Heading>Source</Heading>
    <TextInput source="based_on" label="Based on" fullWidth
               helperText="A source not in this catalog, e.g. America the Beautiful (Bates/Ward, PD). Leave blank for a cover: the song row is the original." />
    <Row>
      <ReferenceInput source="derived_from_id" reference="song" perPage={500}
                      sort={{ field: 'title', order: 'ASC' }}>
        <AutocompleteInput optionText="title" label="Derived from"
                           filterToQuery={byTitle}
                           helperText="Only when the source is in this catalog" />
      </ReferenceInput>
      <SelectInput source="derivation_type" choices={derivationTypes}
                   label="Derivation type"
                   helperText="Only when new authorship exists" />
    </Row>
  </>
);

export default CopyrightFields;