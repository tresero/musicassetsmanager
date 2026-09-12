import {
  List, Datagrid, TextField, NumberField,
  Edit, SimpleForm, TextInput, NumberInput,
} from 'react-admin';

const KeyList = () => (
  <List sort={{ field: 'accidentals', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick="edit">
      <TextField source="name" />
      <TextField source="tonic" />
      <TextField source="mode" />
      <NumberField source="accidentals" />
    </Datagrid>
  </List>
);

const KeyEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name" required />
      <TextInput source="tonic" required />
      <TextInput source="mode" required />
      <NumberInput source="accidentals" required />
    </SimpleForm>
  </Edit>
);

export default { list: KeyList, edit: KeyEdit, recordRepresentation: 'name' };
