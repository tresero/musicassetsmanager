import { List, Datagrid, TextField, ReferenceField } from 'react-admin';

const ProList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick={false}>
      <TextField source="code" />
      <TextField source="name" />
      <TextField source="cisac_code" label="CISAC" />
      <ReferenceField source="home_country" reference="country" label="Country" />
    </Datagrid>
  </List>
);

export default { list: ProList, recordRepresentation: 'name' };
