import { List, Datagrid, TextField, Edit, SimpleForm, TextInput } from 'react-admin';

const CountryList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick="edit">
      <TextField source="code" />
      <TextField source="name" />
    </Datagrid>
  </List>
);

const CountryEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="code" required />
      <TextInput source="name" required />
    </SimpleForm>
  </Edit>
);

export default { list: CountryList, edit: CountryEdit, recordRepresentation: 'name' };
