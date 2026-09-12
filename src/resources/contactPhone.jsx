import {
  List, Datagrid, TextField, NumberField, BooleanField, DateField,
  Edit, Create, SimpleForm, TextInput, NumberInput, BooleanInput,
} from 'react-admin';

const PhoneList = () => (
  <List sort={{ field: 'contact_id', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit">
      <NumberField source="contact_id" label="Contact" />
      <NumberField source="country_code" label="CC" />
      <TextField source="number" />
      <TextField source="extension" label="Ext" emptyText="—" />
      <BooleanField source="is_primary" label="Primary" />
      <TextField source="note" emptyText="—" />
    </Datagrid>
  </List>
);

const PhoneForm = () => (
  <SimpleForm>
    <NumberInput source="contact_id" label="Contact" required />
    <NumberInput source="country_code" label="Country code" defaultValue={1} required />
    <TextInput source="number" required />
    <TextInput source="extension" label="Extension" />
    <BooleanInput source="is_primary" label="Primary" />
    <TextInput source="note" fullWidth />
  </SimpleForm>
);

export default {
  list: PhoneList,
  edit: () => <Edit><PhoneForm /></Edit>,
  create: () => <Create><PhoneForm /></Create>,
};