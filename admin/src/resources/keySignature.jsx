import { List, Datagrid, TextField, NumberField } from 'react-admin';

const KeyList = () => (
  <List sort={{ field: 'accidentals', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick={false} bulkActionButtons={false}>
      <TextField source="name" />
      <TextField source="tonic" />
      <TextField source="mode" />
      <NumberField source="accidentals" />
    </Datagrid>
  </List>
);

export default { list: KeyList, recordRepresentation: 'name' };
