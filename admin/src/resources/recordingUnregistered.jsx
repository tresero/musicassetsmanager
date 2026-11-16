import { List, Datagrid, TextField } from 'react-admin';

// Recordings with no copyright registration that applies: none of their own,
// no attached Copyright Registration document with a number, and no
// registered release they are on. Registering a release covers its tracks.
const UnregisteredRecordingList = () => (
  <List sort={{ field: 'title', order: 'ASC' }} perPage={100}
        title="Unregistered recordings">
    <Datagrid rowClick={(id) => `/recording/${id}`} bulkActionButtons={false}>
      <TextField source="title" />
      <TextField source="version_label" label="Version" emptyText="" />
      <TextField source="artist_names" label="Artist" emptyText="" />
      <TextField source="release_titles" label="On releases" emptyText="" sortable={false} />
    </Datagrid>
  </List>
);

export default { list: UnregisteredRecordingList };
