import { List, Datagrid, TextField } from 'react-admin';

const VocabList = () => (
  <List sort={{ field: 'prefix', order: 'ASC' }}>
    <Datagrid rowClick={false} bulkActionButtons={false}>
      <TextField source="prefix" />
      <TextField source="name" />
      <TextField source="base_uri" label="Base URI" />
    </Datagrid>
  </List>
);

export default { list: VocabList, recordRepresentation: 'name' };
