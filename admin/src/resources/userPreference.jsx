import {
  List, Datagrid, ReferenceField, Edit, Create, SimpleForm, Toolbar, SaveButton,
  useRedirect, usePermissions,
} from 'react-admin';
import { CountryInput } from './shared';

// One row per user, their own. The list shows it, or offers to create it.
const UserPreferenceList = () => (
  <List pagination={false} exporter={false} title="My settings">
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <ReferenceField source="country_code" reference="country"
                      label="Default country" emptyText="United States (not set)" />
    </Datagrid>
  </List>
);

const UserPreferenceForm = () => (
  <SimpleForm toolbar={<Toolbar><SaveButton /></Toolbar>}>
    <CountryInput source="country_code" label="Default country"
                  helperText="Listed first in every country picker and filled in on new recordings. United States when not set."
                  sx={{ width: { xs: '100%', md: 400 } }} />
  </SimpleForm>
);

// The default country travels with the permissions from api.me, which are
// cached; fetch them again on save so the new default applies at once.
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
