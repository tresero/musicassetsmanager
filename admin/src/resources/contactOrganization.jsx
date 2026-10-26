import {
  List, Datagrid, TextField, BooleanField, ReferenceField,
  Edit, Create, SimpleForm, TextInput, BooleanInput,
  ReferenceInput, AutocompleteInput,
} from 'react-admin';

const CoList = () => (
  <List perPage={50}>
    <Datagrid rowClick="edit">
      <ReferenceField source="contact_id" reference="contact" label="Person" />
      <ReferenceField source="organization_id" reference="organization" label="Company" />
      <TextField source="title" emptyText="—" />
      <BooleanField source="is_primary" label="Primary" />
    </Datagrid>
  </List>
);

const CoForm = () => (
  <SimpleForm>
    <ReferenceInput source="contact_id" reference="contact" perPage={100}
                    sort={{ field: 'sort_name', order: 'ASC' }}>
      <AutocompleteInput optionText="display_name" label="Person" required />
    </ReferenceInput>
    <ReferenceInput source="organization_id" reference="organization" perPage={100}
                    sort={{ field: 'name', order: 'ASC' }}>
      <AutocompleteInput optionText="name" label="Company" required />
    </ReferenceInput>
    <TextInput source="title" />
    <BooleanInput source="is_primary" label="Primary affiliation" />
    <TextInput source="notes" multiline fullWidth />
  </SimpleForm>
);

const strip = ({ created_at, ...rest }) => rest;

export default {
  list: CoList,
  edit: () => <Edit transform={strip}><CoForm /></Edit>,
  create: () => <Create transform={strip}><CoForm /></Create>,
};