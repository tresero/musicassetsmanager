import { List, TextField, NumberField, TextInput, NumberInput, required } from 'react-admin';
import { SharedListGrid, sharedList } from './shared';

const RoleGroupList = () => (
  <List sort={{ field: 'sort_order', order: 'ASC' }}>
    <SharedListGrid>
      <TextField source="name" />
      <TextField source="purpose" />
      <NumberField source="sort_order" label="Order" />
    </SharedListGrid>
  </List>
);

const RoleGroupInputs = () => (<>
  <TextInput source="name" validate={required()} />
  <TextInput source="purpose" multiline fullWidth helperText="What the roles in this group are for" />
  <NumberInput source="sort_order" label="Order" defaultValue={0} validate={required()}
               helperText="Groups are listed from lowest to highest" />
</>);

export default sharedList({ list: RoleGroupList, Inputs: RoleGroupInputs });
