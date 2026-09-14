import { List, Datagrid, TextField, DateField, NumberField } from 'react-admin';

const ExpiringList = () => (
  <List sort={{ field: 'expires_on', order: 'ASC' }} perPage={100}
        title="Documents expiring soon">
    <Datagrid rowClick={false}>
      <TextField source="title" />
      <TextField source="document_type" label="Type" emptyText="—" />
      <DateField source="expires_on" label="Expires" />
      <NumberField source="days_left" label="Days left" />
    </Datagrid>
  </List>
);

export default { list: ExpiringList };
