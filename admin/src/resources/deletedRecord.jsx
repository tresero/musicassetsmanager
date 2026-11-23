import {
  List, Datagrid, TextField, DateField, FunctionField, SelectInput, useRecordContext,
} from 'react-admin';
import { Alert, Box, Typography } from '@mui/material';
import { ChangeLines } from './changeHistory';
import { tableLabel } from '../changes';

const types = ['song', 'recording', 'release', 'contact', 'organization', 'artist']
  .map((id) => ({ id, name: tableLabel(id) }));

const filters = [
  <SelectInput key="type" source="record_type" label="Type" choices={types} alwaysOn />,
];

const Empty = () => (
  <Alert severity="success" sx={{ m: 2 }}>Nothing has been deleted since history began.</Alert>
);

// What was deleted, field by field, with the child rows the delete took with
// it, so the record can be entered again by hand.
const Detail = () => {
  const record = useRecordContext();
  const own = {
    ...record, op: 'delete', table_name: record.record_type,
  };
  return (
    <Box sx={{ py: 1 }}>
      <ChangeLines entry={own} showSubject={false} />
      {record.child_rows.map((row) => (
        <ChangeLines key={row.id}
                     entry={{ ...row, op: 'delete', record_type: record.record_type }} />
      ))}
      {!record.child_rows.length && (
        <Typography variant="body2" color="text.secondary">No child rows.</Typography>
      )}
    </Box>
  );
};

const DeletedList = () => (
  <List sort={{ field: 'id', order: 'DESC' }} perPage={50} filters={filters}
        title="Deleted records" empty={<Empty />}>
    <Datagrid rowClick="expand" expand={<Detail />} bulkActionButtons={false}>
      <FunctionField label="Type" render={(r) => tableLabel(r.record_type)} />
      <TextField source="record_label" label="Name" />
      <DateField source="deleted_at" label="Deleted" showTime />
      <TextField source="deleted_by" label="By" />
    </Datagrid>
  </List>
);

export default { list: DeletedList };
