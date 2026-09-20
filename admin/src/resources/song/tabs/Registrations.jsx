import {
  ArrayInput, SimpleFormIterator, TextInput, DateInput,
  ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { byCode, proOptionText, proInputText } from '../../vocab';

const RegistrationsFields = () => (
  <ArrayInput source="registrations" label={false}>
    <SimpleFormIterator inline>
      <ReferenceInput source="pro_code" reference="pro" perPage={500}
                      sort={{ field: 'code', order: 'ASC' }}>
        <AutocompleteInput label="Society"
                           optionText={proOptionText}
                           inputText={proInputText}
                           filterToQuery={byCode}
                           helperText={false}
                           sx={{ width: 160 }} />
      </ReferenceInput>
      <TextInput source="work_number" label="Work number" helperText={false}
                 sx={{ width: 170 }} />
      <DateInput source="registered_on" label="Registered" helperText={false}
                 sx={{ width: 170 }} />
      <TextInput source="notes" label="Note" helperText={false}
                 sx={{ width: 260 }} />
    </SimpleFormIterator>
  </ArrayInput>
);

export default RegistrationsFields;