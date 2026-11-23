import {
  ArrayInput, TextInput, DateInput,
  ReferenceInput, AutocompleteInput,
  required,
} from 'react-admin';
import { byCode, proOptionText, proInputText } from '../../vocab';
import { RowIterator } from '../../shared';

const RegistrationsFields = () => (
  <ArrayInput source="registrations" label={false}>
    <RowIterator>
      <ReferenceInput source="pro_code" reference="pro" perPage={500}
                      sort={{ field: 'code', order: 'ASC' }}>
        <AutocompleteInput label="Society"
                           optionText={proOptionText}
                           inputText={proInputText}
                           filterToQuery={byCode}
                           helperText={false} validate={required()}
                           sx={{ width: 160 }} />
      </ReferenceInput>
      <TextInput source="work_number" label="Work number" helperText={false}
                 sx={{ width: 170 }} />
      <DateInput source="registered_on" label="Registered" helperText={false}
                 sx={{ width: 170 }} />
      <TextInput source="notes" label="Note" helperText={false}
                 sx={{ width: 260 }} />
    </RowIterator>
  </ArrayInput>
);

export default RegistrationsFields;