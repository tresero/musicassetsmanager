import {
  List, Datagrid, TextField, DateField, BulkDeleteButton,
} from 'react-admin';
import { Alert } from '@mui/material';

const Empty = () => (
  <Alert severity="success" sx={{ m: 2 }}>
    Every document is attached to something.
  </Alert>
);

const OrphanList = () => (
  <List sort={{ field: 'created_at', order: 'DESC' }} perPage={100}
        title="Documents attached to nothing"
        empty={<Empty />}>
    <Datagrid rowClick={false}
              bulkActionButtons={<BulkDeleteButton mutationMode="pessimistic" />}>
      <TextField source="title" />
      <TextField source="document_type" label="Type" emptyText="—" />
      <TextField source="storage_uri" label="Location" />
      <DateField source="document_date" label="Date" emptyText="—" />
      <DateField source="created_at" label="Added" />
    </Datagrid>
  </List>
);

export default { list: OrphanList };
