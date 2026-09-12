import {
  List, Datagrid, TextField, ReferenceField,
  Edit, Create, SimpleForm, TextInput, ReferenceInput, SelectInput,
} from 'react-admin';

const GenreList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick="edit">
      <TextField source="name" />
      <ReferenceField source="parent_id" reference="genre" label="Parent" emptyText="—" />
      <ReferenceField source="schema_class_id" reference="schema_type" label="Schema type" emptyText="—" />
      <TextField source="mo_term" label="MO term" emptyText="—" />
    </Datagrid>
  </List>
);

const GenreForm = () => (
  <SimpleForm>
    <TextInput source="name" required />
    <ReferenceInput source="parent_id" reference="genre" perPage={200} sort={{ field: 'name', order: 'ASC' }}>
      <SelectInput optionText="name" label="Parent genre" />
    </ReferenceInput>
    <ReferenceInput source="schema_class_id" reference="schema_type">
      <SelectInput optionText="curie" label="Schema type" />
    </ReferenceInput>
    <TextInput source="mo_term" label="MO term" />
  </SimpleForm>
);

export default {
  list: GenreList,
  edit: () => <Edit><GenreForm /></Edit>,
  create: () => <Create><GenreForm /></Create>,
  recordRepresentation: 'name',
};
