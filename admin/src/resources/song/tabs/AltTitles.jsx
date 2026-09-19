import {
  ArrayInput, SimpleFormIterator, TextInput, SelectInput,
  ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { titleTypes, byName } from '../../vocab';

const AltTitlesFields = () => (
  <ArrayInput source="titles" label={false}>
    <SimpleFormIterator inline>
      <TextInput source="title" label="Title" sx={{ width: 280 }} />
      <SelectInput source="title_type" choices={titleTypes}
                   label="Type" defaultValue="alternate" sx={{ width: 150 }} />
      <ReferenceInput source="language_code" reference="language" perPage={300}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Language"
                           filterToQuery={byName} sx={{ width: 180 }} />
      </ReferenceInput>
    </SimpleFormIterator>
  </ArrayInput>
);

export default AltTitlesFields;
