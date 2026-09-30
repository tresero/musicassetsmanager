import {
  List, Datagrid, TextField, NumberField, BooleanField, ReferenceField,
  SearchInput, NullableBooleanInput,
} from 'react-admin';
import { ListActions } from '../listActions';

const filters = [
  <SearchInput source="title@ilike" alwaysOn />,
  <NullableBooleanInput source="one_stop" label="One stop" />,
];

const SongList = () => (
  <List filters={filters} actions={<ListActions />}
        sort={{ field: 'title', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit">
      <TextField source="title" />
      <TextField source="iswc" label="ISWC" emptyText="—" />
      <ReferenceField source="language_code" reference="language"
                      label="Language" emptyText="—" />
      <NumberField source="writer_total" label="Writer %" />
      <NumberField source="publisher_total" label="Pub %" />
      <BooleanField source="one_stop" label="One stop" />
    </Datagrid>
  </List>
);

export default SongList;
