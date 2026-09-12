import { List, Datagrid, TextField } from 'react-admin';

const SchemaTypeList = () => (
  <List sort={{ field: 'class_name', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick={false}>
      <TextField source="class_name" label="Class" />
      <TextField source="vocabulary" />
      <TextField source="uri" label="URI" />
    </Datagrid>
  </List>
);

export default { list: SchemaTypeList, recordRepresentation: 'curie' };
