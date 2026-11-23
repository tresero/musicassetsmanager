import { useGetList, useRecordContext } from 'react-admin';
import { Alert, Box, LinearProgress, Typography } from '@mui/material';
import { describeChange, groupChanges } from '../changes';

// One change to a row, in words, with its fields below it.
export const ChangeLines = ({ entry, showSubject = true }) => {
  const { subject, action, lines } = describeChange(entry);
  return (
    <>
      {showSubject && (
        <Typography variant="body2">
          <Box component="span" sx={{ fontWeight: 'bold' }}>{subject}</Box> {action}
        </Typography>
      )}
      {lines.length > 0 && (
        <Box component="ul" sx={{ mt: 0.25, mb: 0.5, pl: 3 }}>
          {lines.map((line) => (
            <Typography component="li" variant="body2" key={line}>{line}</Typography>
          ))}
        </Box>
      )}
    </>
  );
};

const when = (at) => new Date(at).toLocaleString(undefined, {
  dateStyle: 'medium', timeStyle: 'short',
});

const LIMIT = 500;

// The History tab: every change to the record and its child rows, newest
// first, one block per save. Changes made before history was recorded
// (#78) are not listed.
export const ChangeHistory = ({ recordType }) => {
  const record = useRecordContext();
  const { data, total, isPending, error } = useGetList(
    'change_log',
    {
      filter: { record_type: recordType, record_id: record?.id },
      sort: { field: 'id', order: 'DESC' },
      pagination: { page: 1, perPage: LIMIT },
    },
    { enabled: record?.id != null },
  );
  if (record?.id == null) {
    return <Typography color="text.secondary">History starts once this is saved.</Typography>;
  }
  if (isPending) return <LinearProgress sx={{ width: '100%' }} />;
  if (error) return <Alert severity="error">The history could not be loaded.</Alert>;
  if (!data.length) {
    return (
      <Typography color="text.secondary">
        No changes recorded yet. Changes made before history was turned on are not listed.
      </Typography>
    );
  }
  return (
    <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, width: '100%',
                              display: 'flex', flexDirection: 'column', gap: 1 }}>
      {groupChanges(data).map((group) => (
        <Box component="li" key={group.change_set}
             sx={{ border: '1px solid', borderColor: 'grey.600', borderRadius: 1,
                   bgcolor: 'background.paper', px: 1.5, py: 1 }}>
          <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
            {when(group.changed_at)} · {group.changed_by}
          </Typography>
          {group.entries.map((entry) => <ChangeLines key={entry.id} entry={entry} />)}
        </Box>
      ))}
      {total > LIMIT && (
        <Typography component="li" color="text.secondary">
          Showing the latest {LIMIT} of {total} changes.
        </Typography>
      )}
    </Box>
  );
};
