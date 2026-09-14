import {
  List, Datagrid, TextField, NumberField,
  Edit, Create, SimpleForm, TextInput, NumberInput,
} from 'react-admin';

const RoleGroupList = () => (
  <List sort={{ field: 'sort_order', order: 'ASC' }}>
    <Datagrid rowClick="edit">
      <TextField source="name" />
      <TextField source="purpose" />
      <NumberField source="sort_order" label="Order" />
    </Datagrid>
  </List>
);

const RoleGroupForm = () => (
  <SimpleForm>
    <TextInput source="name" required />
    <TextInput source="purpose" multiline fullWidth />
    <NumberInput source="sort_order" label="Order" />
  </SimpleForm>
);

export default {
  list: RoleGroupList,
  edit: () => <Edit><RoleGroupForm /></Edit>,
  create: () => <Create><RoleGroupForm /></Create>,
  recordRepresentation: 'name',
};
