import {
  List, Datagrid, TextField, NumberField, ReferenceField, SearchInput,
} from 'react-admin';

const filters = [<SearchInput source="title@ilike" alwaysOn />];

const SongList = () => (
  <List filters={filters} sort={{ field: 'title', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit">
      <TextField source="title" />
      <TextField source="iswc" label="ISWC" emptyText="—" />
      <ReferenceField source="language_code" reference="language"
                      label="Language" emptyText="—" />
      <NumberField source="writer_total" label="Writer %" />
      <NumberField source="publisher_total" label="Pub %" />
    </Datagrid>
  </List>
);

export default SongList;
