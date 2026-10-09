import { List, Datagrid, TextField, ReferenceField } from 'react-admin';

const GenreList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick={false} bulkActionButtons={false}>
      <TextField source="name" />
      <ReferenceField source="parent_id" reference="genre" label="Parent" emptyText="—" />
      <ReferenceField source="schema_class_id" reference="schema_type" label="Schema type" emptyText="—" />
      <TextField source="mo_term" label="MO term" emptyText="—" />
    </Datagrid>
  </List>
);

export default { list: GenreList, recordRepresentation: 'name' };
