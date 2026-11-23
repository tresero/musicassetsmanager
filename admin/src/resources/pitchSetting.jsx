import {
  List, Datagrid, ReferenceField, Edit, Create, SimpleForm, Toolbar, SaveButton,
} from 'react-admin';
import { Alert } from '@mui/material';
import { PersonInput } from './partyInputs';

// One row per account. The list shows it, or offers to create it.
const PitchSettingList = () => (
  <List pagination={false} exporter={false} title="Pitch settings">
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <ReferenceField source="default_contact_id" reference="contact"
                      label="Default pitch contact" emptyText="None set" />
    </Datagrid>
  </List>
);

const PitchSettingForm = () => (
  <SimpleForm toolbar={<Toolbar><SaveButton /></Toolbar>}>
    <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
      Set this up first, with Storage, before adding recordings. Each
      recording&apos;s pitch comment, the line that travels with the file to
      whoever you send it to, names who to call about it: the recording&apos;s own
      pitch contact, or this one when it has none.
    </Alert>
    <PersonInput source="default_contact_id" label="Default pitch contact" w={400}
                 helperText="Named in a recording's pitch comment when the recording has no pitch contact of its own" />
  </SimpleForm>
);

export default {
  list: PitchSettingList,
  edit: () => <Edit mutationMode="pessimistic"><PitchSettingForm /></Edit>,
  create: () => <Create redirect="list"><PitchSettingForm /></Create>,
};
