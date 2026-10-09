import { List, Datagrid, TextField, ReferenceField } from 'react-admin';

const RoleList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick={false} bulkActionButtons={false}>
      <TextField source="name" />
      <ReferenceField source="role_group_id" reference="role_group" label="Group" />
      <TextField source="description" />
    </Datagrid>
  </List>
);

export default { list: RoleList, recordRepresentation: 'name' };
