import { List, Datagrid, TextField, BooleanField, SearchInput } from 'react-admin';

const filters = [<SearchInput source="name@ilike" alwaysOn />];

const ArtistList = () => (
  <List filters={filters} sort={{ field: 'name', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick={false}>
      <TextField source="name" />
      <TextField source="kind" />
      <TextField source="isni" label="ISNI" emptyText="—" />
      <BooleanField source="isni_inherited" label="Inherited" />
    </Datagrid>
  </List>
);

export default { list: ArtistList, recordRepresentation: 'name' };