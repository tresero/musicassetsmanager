import { List, Datagrid, TextField, NumberField } from 'react-admin';

const DupeList = () => (
  <List sort={{ field: 'contact_count', order: 'DESC' }} perPage={50}>
    <Datagrid rowClick={false}>
      <TextField source="email" />
      <NumberField source="contact_count" label="Contacts" />
      <TextField source="contact_ids" label="Contact IDs" />
    </Datagrid>
  </List>
);

export default { list: DupeList };