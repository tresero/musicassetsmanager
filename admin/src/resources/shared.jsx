import { List, Datagrid, TextField } from 'react-admin';

export const NameList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick={false} bulkActionButtons={false}>
      <TextField source="name" />
    </Datagrid>
  </List>
);
