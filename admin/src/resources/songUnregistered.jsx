import { List, Datagrid, TextField, BooleanField } from 'react-admin';

const UnregisteredList = () => (
  <List sort={{ field: 'title', order: 'ASC' }} perPage={100}
        title="Registration gaps">
    <Datagrid rowClick={false}>
      <TextField source="title" />
      <BooleanField source="on_mlc" label="MLC" />
      <BooleanField source="on_pro" label="PRO" />
      <BooleanField source="copyright_filed" label="© filed" />
    </Datagrid>
  </List>
);

export default { list: UnregisteredList };
