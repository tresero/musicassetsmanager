import {
  List, Datagrid, TextField, ReferenceField,
  Edit, Create, SimpleForm, TextInput, ReferenceInput, SelectInput,
} from 'react-admin';

const RoleList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick="edit">
      <TextField source="name" />
      <ReferenceField source="role_group_id" reference="role_group" label="Group" />
      <TextField source="description" />
    </Datagrid>
  </List>
);

const RoleForm = () => (
  <SimpleForm>
    <TextInput source="name" required />
    <ReferenceInput source="role_group_id" reference="role_group">
      <SelectInput optionText="name" required />
    </ReferenceInput>
    <TextInput source="description" multiline fullWidth />
  </SimpleForm>
);

export default {
  list: RoleList,
  edit: () => <Edit><RoleForm /></Edit>,
  create: () => <Create><RoleForm /></Create>,
  recordRepresentation: 'name',
};
