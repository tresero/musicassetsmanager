import { List, Datagrid, TextField } from 'react-admin';

const LanguageList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={200}>
    <Datagrid rowClick={false} bulkActionButtons={false}>
      <TextField source="code" />
      <TextField source="name" />
      <TextField source="iso_name" label="ISO name" />
    </Datagrid>
  </List>
);

export default { list: LanguageList, recordRepresentation: 'name' };
