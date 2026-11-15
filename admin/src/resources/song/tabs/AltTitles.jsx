import {
  ArrayInput, SimpleFormIterator, TextInput, SelectInput,
  required,
} from 'react-admin';
import { titleTypes } from '../../vocab';
import { LanguageInput } from '../../shared';

const AltTitlesFields = () => (
  <ArrayInput source="titles" label={false}>
    <SimpleFormIterator inline>
      <TextInput source="title" label="Title" helperText={false} validate={required()}
                 sx={{ width: 300 }} />
      <SelectInput source="title_type" choices={titleTypes} label="Type"
                   defaultValue="alternate" helperText={false}
                   sx={{ width: 160 }} />
      <LanguageInput sx={{ width: 190 }} />
    </SimpleFormIterator>
  </ArrayInput>
);

export default AltTitlesFields;