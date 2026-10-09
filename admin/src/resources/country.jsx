import { List, Datagrid, TextField } from 'react-admin';

const CountryList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick={false} bulkActionButtons={false}>
      <TextField source="code" />
      <TextField source="name" />
    </Datagrid>
  </List>
);

export default { list: CountryList, recordRepresentation: 'name' };
