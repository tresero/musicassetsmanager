import { List, TextField, TextInput, required } from 'react-admin';
import { SharedListGrid, sharedList } from './shared';

const LanguageList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={200}>
    <SharedListGrid>
      <TextField source="code" />
      <TextField source="name" />
      <TextField source="iso_name" label="ISO name" />
    </SharedListGrid>
  </List>
);

const LanguageInputs = () => (<>
  <TextInput source="code" validate={required()}
             helperText="ISO 639 code, such as en or es" />
  <TextInput source="name" validate={required()} helperText="As it appears in the pickers" />
  <TextInput source="iso_name" label="ISO name" fullWidth
             helperText="The name in the ISO 639 list, if it differs" />
</>);

export default sharedList({ list: LanguageList, Inputs: LanguageInputs });
