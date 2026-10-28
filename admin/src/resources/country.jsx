import { List, TextField, NumberField, TextInput, NumberInput, required } from 'react-admin';
import { SharedListGrid, sharedList } from './shared';

const CountryList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <SharedListGrid>
      <TextField source="code" />
      <TextField source="name" />
      <NumberField source="calling_code" label="Calling code" emptyText="—" />
    </SharedListGrid>
  </List>
);

const CountryInputs = () => (<>
  <TextInput source="code" validate={required()}
             helperText="ISO 3166-1 alpha-2, such as US or GB" />
  <TextInput source="name" validate={required()} />
  <NumberInput source="calling_code" label="Calling code"
               helperText="Without the plus, such as 1 or 44. A new phone number starts on the calling code of the user's default country." />
</>);

export default sharedList({ list: CountryList, Inputs: CountryInputs });
