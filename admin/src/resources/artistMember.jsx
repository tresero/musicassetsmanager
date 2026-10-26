import {
  List, Datagrid, DateField, ReferenceField,
  Edit, Create, SimpleForm, TextInput, DateInput,
  ReferenceInput, AutocompleteInput,
} from 'react-admin';

const AmList = () => (
  <List perPage={50}>
    <Datagrid rowClick="edit">
      <ReferenceField source="artist_id" reference="artist" label="Artist" />
      <ReferenceField source="contact_id" reference="contact" label="Person" />
      <DateField source="begin_date" label="From" emptyText="—" />
      <DateField source="end_date" label="To" emptyText="—" />
    </Datagrid>
  </List>
);

const AmForm = () => (
  <SimpleForm>
    <ReferenceInput source="artist_id" reference="artist" perPage={100}
                    sort={{ field: 'name', order: 'ASC' }}>
      <AutocompleteInput optionText="name" label="Artist" required />
    </ReferenceInput>
    <ReferenceInput source="contact_id" reference="contact" perPage={100}
                    sort={{ field: 'sort_name', order: 'ASC' }}>
      <AutocompleteInput optionText="display_name" label="Person" required />
    </ReferenceInput>
    <DateInput source="begin_date" label="From" />
    <DateInput source="end_date" label="To" />
    <TextInput source="notes" multiline fullWidth />
  </SimpleForm>
);

export default {
  list: AmList,
  edit: () => <Edit><AmForm /></Edit>,
  create: () => <Create><AmForm /></Create>,
};