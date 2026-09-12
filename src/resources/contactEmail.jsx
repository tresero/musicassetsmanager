import {
  List, Datagrid, TextField, NumberField, BooleanField, DateField,
  Edit, Create, SimpleForm, TextInput, NumberInput, BooleanInput, DateTimeInput,
} from 'react-admin';

const EmailList = () => (
  <List sort={{ field: 'contact_id', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit">
      <NumberField source="contact_id" label="Contact" />
      <TextField source="email" />
      <BooleanField source="is_primary" label="Primary" />
      <BooleanField source="is_shared" label="Shared" />
      <DateField source="retired_at" label="Retired" emptyText="—" />
      <TextField source="note" emptyText="—" />
    </Datagrid>
  </List>
);

const EmailForm = () => (
  <SimpleForm>
    <NumberInput source="contact_id" label="Contact" required />
    <TextInput source="email" type="email" fullWidth required />
    <BooleanInput source="is_primary" label="Primary" />
    <BooleanInput source="is_shared" label="Shared / role address" />
    <DateTimeInput source="retired_at" label="Retired" />
    <TextInput source="note" fullWidth />
  </SimpleForm>
);

export default {
  list: EmailList,
  edit: () => <Edit><EmailForm /></Edit>,
  create: () => <Create><EmailForm /></Create>,
};