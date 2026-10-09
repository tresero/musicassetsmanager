import { List, Datagrid, TextField, NumberField } from 'react-admin';

const RoleGroupList = () => (
  <List sort={{ field: 'sort_order', order: 'ASC' }}>
    <Datagrid rowClick={false} bulkActionButtons={false}>
      <TextField source="name" />
      <TextField source="purpose" />
      <NumberField source="sort_order" label="Order" />
    </Datagrid>
  </List>
);

export default { list: RoleGroupList, recordRepresentation: 'name' };
