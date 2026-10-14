import { List, TextField, TextInput, required } from 'react-admin';
import { SharedListGrid, sharedList } from './shared';

const CountryList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <SharedListGrid>
      <TextField source="code" />
      <TextField source="name" />
    </SharedListGrid>
  </List>
);

const CountryInputs = () => (<>
  <TextInput source="code" validate={required()}
             helperText="ISO 3166-1 alpha-2, such as US or GB" />
  <TextInput source="name" validate={required()} />
</>);

export default sharedList({ list: CountryList, Inputs: CountryInputs });
