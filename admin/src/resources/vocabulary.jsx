import {
  List, Datagrid, TextField,
  Edit, Create, SimpleForm, TextInput,
} from 'react-admin';

const VocabList = () => (
  <List sort={{ field: 'prefix', order: 'ASC' }}>
    <Datagrid rowClick="edit">
      <TextField source="prefix" />
      <TextField source="name" />
      <TextField source="base_uri" label="Base URI" />
    </Datagrid>
  </List>
);

const VocabForm = () => (
  <SimpleForm>
    <TextInput source="prefix" required />
    <TextInput source="name" required />
    <TextInput source="base_uri" label="Base URI" fullWidth required />
  </SimpleForm>
);

export default {
  list: VocabList,
  edit: () => <Edit><VocabForm /></Edit>,
  create: () => <Create><VocabForm /></Create>,
  recordRepresentation: 'name',
};
