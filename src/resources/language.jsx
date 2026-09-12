import { List, Datagrid, TextField, Edit, Create, SimpleForm, TextInput } from 'react-admin';

const LanguageList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={200}>
    <Datagrid rowClick="edit">
      <TextField source="code" />
      <TextField source="name" />
      <TextField source="iso_name" label="ISO name" />
    </Datagrid>
  </List>
);

const LanguageForm = () => (
  <SimpleForm>
    <TextInput source="code" required />
    <TextInput source="name" required />
    <TextInput source="iso_name" label="ISO name" fullWidth />
  </SimpleForm>
);

export default {
  list: LanguageList,
  edit: () => <Edit><LanguageForm /></Edit>,
  create: () => <Create><LanguageForm /></Create>,
  recordRepresentation: 'name',
};