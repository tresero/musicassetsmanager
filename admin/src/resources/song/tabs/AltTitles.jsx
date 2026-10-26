import {
  ArrayInput, SimpleFormIterator, TextInput, SelectInput,
  ReferenceInput, AutocompleteInput,
  required,
} from 'react-admin';
import { titleTypes } from '../../vocab';

const AltTitlesFields = () => (
  <ArrayInput source="titles" label={false}>
    <SimpleFormIterator inline>
      <TextInput source="title" label="Title" helperText={false} validate={required()}
                 sx={{ width: 300 }} />
      <SelectInput source="title_type" choices={titleTypes} label="Type"
                   defaultValue="alternate" helperText={false}
                   sx={{ width: 160 }} />
      <ReferenceInput source="language_code" reference="language" perPage={300}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Language"
                           helperText={false}
                           sx={{ width: 190 }} />
      </ReferenceInput>
    </SimpleFormIterator>
  </ArrayInput>
);

export default AltTitlesFields;