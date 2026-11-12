import {
  List, Datagrid, BooleanField, Edit, SimpleForm, BooleanInput, Toolbar, SaveButton,
} from 'react-admin';

// Settings for the whole installation, for the site admin. The view always
// has one row, id 1; the database refuses changes from anyone else.
const SiteSettingList = () => (
  <List pagination={false} exporter={false} title="Site settings">
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <BooleanField source="allow_local_storage" label="Accounts may use Local disk" />
    </Datagrid>
  </List>
);

const SiteSettingEdit = () => (
  <Edit mutationMode="pessimistic" redirect="list" title="Site settings">
    <SimpleForm toolbar={<Toolbar><SaveButton /></Toolbar>}>
      <BooleanInput source="allow_local_storage"
                    label="Let accounts store files on this server's disk"
                    helperText="Off: only your own account can choose Local disk, and every other account brings its own storage, such as S3. Accounts already on Local disk keep it." />
    </SimpleForm>
  </Edit>
);

export default {
  list: SiteSettingList,
  edit: SiteSettingEdit,
};
