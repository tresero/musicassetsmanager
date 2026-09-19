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
                           sx={{ width: 140 }} />
      </ReferenceInput>
      <TextInput source="work_number" label="Work number" sx={{ width: 160 }} />
      <DateInput source="registered_on" label="Registered" />
      <TextInput source="notes" label="Note" sx={{ width: 240 }} />
    </SimpleFormIterator>
  </ArrayInput>
);

export default RegistrationsFields;
