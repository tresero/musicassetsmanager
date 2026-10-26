import {
  List, TextField, NumberField, BooleanField, ReferenceField,
  NullableBooleanInput,
} from 'react-admin';
import { CatalogDatagrid, searchFilter } from '../shared';

const filters = [
  searchFilter,
  <NullableBooleanInput source="one_stop" label="One stop" />,
  <NullableBooleanInput source="easy_clear" label="Easy clear" />,
];

const SongList = () => (
  <List filters={filters} sort={{ field: 'title', order: 'ASC' }} perPage={50}>
    <CatalogDatagrid rowClick="edit">
      <TextField source="title" />
      <TextField source="iswc" label="ISWC" emptyText="—" />
      <ReferenceField source="language_code" reference="language"
                      label="Language" emptyText="—" />
      <NumberField source="writer_total" label="Writer %" />
      <NumberField source="publisher_total" label="Pub %" />
      <BooleanField source="one_stop" label="One stop" />
      <BooleanField source="easy_clear" label="Easy clear" />
    </CatalogDatagrid>
  </List>
);

export default SongList;
