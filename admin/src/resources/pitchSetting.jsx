import {
  List, Datagrid, ReferenceField, Edit, Create, SimpleForm, Toolbar, SaveButton,
  ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { bySortName } from './vocab';

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
    <ReferenceInput source="default_contact_id" reference="contact" perPage={200}
                    sort={{ field: 'sort_name', order: 'ASC' }}>
      <AutocompleteInput optionText="sort_name" label="Default pitch contact"
                         filterToQuery={bySortName}
                         helperText="Named in a recording's pitch comment when the recording has no pitch contact of its own"
                         sx={{ width: { xs: '100%', md: 400 } }} />
    </ReferenceInput>
  </SimpleForm>
);

export default {
  list: PitchSettingList,
  edit: () => <Edit mutationMode="pessimistic"><PitchSettingForm /></Edit>,
  create: () => <Create redirect="list"><PitchSettingForm /></Create>,
};
