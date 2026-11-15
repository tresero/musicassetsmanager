import {
  List, Datagrid, ReferenceField, ReferenceArrayField, SingleFieldList, ChipField,
  ReferenceArrayInput, AutocompleteArrayInput, Edit, Create, SimpleForm, Toolbar,
  SaveButton, SelectInput, SelectField, useRedirect, usePermissions,
} from 'react-admin';
import { parentalWarnings } from './vocab';
import { CountryInput } from './shared';

// One row per user, their own. The list shows it, or offers to create it.
const UserPreferenceList = () => (
  <List pagination={false} exporter={false} title="My settings">
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <ReferenceField source="country_code" reference="country"
                      label="Default country" emptyText="United States (not set)" />
      <ReferenceArrayField source="language_codes" reference="language" sortable={false}
                           label="Languages listed first" emptyText="English (not set)">
        <SingleFieldList linkType={false}><ChipField source="name" size="small" /></SingleFieldList>
      </ReferenceArrayField>
      <SelectField source="parental_warning" choices={parentalWarnings}
                   label="New recordings start as" emptyText="Not set" />
    </Datagrid>
  </List>
);

const UserPreferenceForm = () => (
  <SimpleForm toolbar={<Toolbar><SaveButton /></Toolbar>}>
    <CountryInput source="country_code" label="Default country"
                  helperText="Listed first in every country picker, filled in on new recordings, and the calling code a new phone number starts on. United States when not set."
                  sx={{ width: { xs: '100%', md: 400 } }} />
    <ReferenceArrayInput source="language_codes" reference="language" perPage={300}
                         sort={{ field: 'name', order: 'ASC' }}>
      <AutocompleteArrayInput optionText="name" label="Languages listed first"
                              helperText="Listed first in every language picker, in the order chosen here. English when not set."
                              sx={{ width: { xs: '100%', md: 400 } }} />
    </ReferenceArrayInput>
    <SelectInput source="parental_warning" label="New recordings start as" emptyText="Not set"
                 choices={parentalWarnings}
                 helperText="The explicit content a new recording starts on. Each recording can still be changed."
                 sx={{ width: { xs: '100%', md: 400 } }} />
  </SimpleForm>
);

// The default country and languages travel with the permissions from
// api.me, which are cached; fetch them again on save so the new defaults
// apply at once.
const useSaved = () => {
  const { refetch } = usePermissions();
  const redirect = useRedirect();
  return {
    onSuccess: () => {
      refetch();
      redirect('list', 'user_preference');
    },
  };
};

const UserPreferenceEdit = () => (
  <Edit mutationMode="pessimistic" mutationOptions={useSaved()}>
    <UserPreferenceForm />
  </Edit>
);

const UserPreferenceCreate = () => (
  <Create mutationOptions={useSaved()}>
    <UserPreferenceForm />
  </Create>
);

export default {
  list: UserPreferenceList,
  edit: UserPreferenceEdit,
  create: UserPreferenceCreate,
};
