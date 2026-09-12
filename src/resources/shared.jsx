import { List, Datagrid, TextField, Edit, Create, SimpleForm, TextInput } from 'react-admin';

export const NameList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick="edit">
      <TextField source="name" />
    </Datagrid>
  </List>
);

const NameForm = () => (
  <SimpleForm>
    <TextInput source="name" required />
  </SimpleForm>
);

export const NameEdit = () => <Edit><NameForm /></Edit>;
export const NameCreate = () => <Create><NameForm /></Create>;
