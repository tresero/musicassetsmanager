import { List, TextField, TextInput, required, regex } from 'react-admin';
import { SharedListGrid, sharedList } from './shared';

const VocabList = () => (
  <List sort={{ field: 'prefix', order: 'ASC' }}>
    <SharedListGrid>
      <TextField source="prefix" />
      <TextField source="name" />
      <TextField source="base_uri" label="Base URI" />
    </SharedListGrid>
  </List>
);

const VocabInputs = () => (<>
  <TextInput source="prefix"
             validate={[required(), regex(/^[a-z][a-z0-9]*$/, 'Lowercase letters and digits, starting with a letter')]}
             helperText="Short form used in schema types, such as schema or mo" />
  <TextInput source="name" validate={required()} />
  <TextInput source="base_uri" label="Base URI" fullWidth
             validate={[required(), regex(/^https?:\/\/.*[/#]$/, 'An http or https address ending in / or #')]}
             helperText="Prefix plus class name gives the full URI, so it ends in / or #" />
</>);

export default sharedList({ list: VocabList, Inputs: VocabInputs });
