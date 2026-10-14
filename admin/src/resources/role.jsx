import {
  List, TextField, ReferenceField, BooleanField,
  TextInput, ReferenceInput, SelectInput, BooleanInput, required,
} from 'react-admin';
import { SharedListGrid, sharedList } from './shared';

const RoleList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <SharedListGrid>
      <TextField source="name" />
      <ReferenceField source="role_group_id" reference="role_group" label="Group" />
      <TextField source="ddex_code" label="DDEX" emptyText="—" />
      <BooleanField source="credit_role" label="Credit" />
      <TextField source="description" />
    </SharedListGrid>
  </List>
);

const RoleInputs = () => (<>
  <TextInput source="name" validate={required()} helperText="As it appears in the pickers" />
  <ReferenceInput source="role_group_id" reference="role_group" sort={{ field: 'sort_order', order: 'ASC' }}>
    <SelectInput optionText="name" label="Group" validate={required()} />
  </ReferenceInput>
  <TextInput source="ddex_code" label="DDEX code"
             helperText="DDEX allowed value. Blank for business roles, such as attorney or sync agent." />
  <BooleanInput source="credit_role" label="Recording credit"
                helperText="Offered in the Roles picker on a recording's credits" />
  <TextInput source="description" multiline fullWidth />
</>);

export default sharedList({ list: RoleList, Inputs: RoleInputs });
