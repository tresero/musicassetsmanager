import {
  List, DataTable, BooleanField, DateField, NullableBooleanInput,
} from 'react-admin';
import { CatalogDataTable, searchFilter } from '../shared';
import { ListActions } from '../listActions';

const filters = [
  searchFilter,
  <NullableBooleanInput source="one_stop" label="One stop" />,
  <NullableBooleanInput source="easy_clear" label="Easy clear" />,
];

const hiddenColumns = [
  'publisher_names', 'writer_total', 'publisher_total', 'one_stop_reason',
  'public_domain_p', 'derivation_type', 'based_on', 'copyright_number',
  'copyright_date', 'reversion_date', 'created_at', 'updated_at',
];

const SongList = () => (
  <List filters={filters} actions={<ListActions />}
        sort={{ field: 'title', order: 'ASC' }} perPage={50}>
    <CatalogDataTable rowClick="edit" hiddenColumns={hiddenColumns}>
      <DataTable.Col source="title" />
      <DataTable.Col source="writer_names" label="Writers" />
      <DataTable.Col source="publisher_names" label="Publishers" />
      <DataTable.Col source="iswc" label="ISWC" />
      <DataTable.Col source="language_name" label="Language" />
      <DataTable.NumberCol source="writer_total" label="Writer %" />
      <DataTable.NumberCol source="publisher_total" label="Pub %" />
      <DataTable.Col source="one_stop" label="One stop" field={BooleanField} />
      <DataTable.Col source="one_stop_reason" label="Not one stop because" />
      <DataTable.Col source="easy_clear" label="Easy clear" field={BooleanField} />
      <DataTable.Col source="public_domain_p" label="Public domain" field={BooleanField} />
      <DataTable.Col source="derivation_type" label="Derivation" />
      <DataTable.Col source="based_on" label="Based on" />
      <DataTable.Col source="copyright_number" label="Copyright no." />
      <DataTable.Col source="copyright_date" label="Copyright date" field={DateField} />
      <DataTable.Col source="reversion_date" label="Reverts" field={DateField} />
      <DataTable.Col source="created_at" label="Added" field={DateField} />
      <DataTable.Col source="updated_at" label="Changed" field={DateField} />
    </CatalogDataTable>
  </List>
);

export default SongList;
