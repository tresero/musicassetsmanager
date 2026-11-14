import { useState } from 'react';
import {
  List, Datagrid, TextField, DateField, NumberField, FunctionField, ReferenceField,
  ReferenceInput, AutocompleteInput, SelectInput, Edit, SimpleForm, Labeled, Toolbar,
  SaveButton, Form, useRecordContext, useUpdate, useCreate, useNotify, useRefresh,
} from 'react-admin';
import { useNavigate } from 'react-router';
import { useWatch } from 'react-hook-form';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableRow, Typography,
  TextField as MuiTextField,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import AddIcon from '@mui/icons-material/Add';
import { useCan } from '../permissions';

const methods = {
  iswc: 'ISWC',
  work_ref: 'Work number',
  title_writer: 'Title and writer',
  title: 'Title',
  manual: 'By hand',
};

export const MatchMethodField = (props) => (
  <FunctionField {...props} render={(r) => methods[r.match_method] ?? ''} />
);

// A usage period, on a line or spanning a statement's lines: blank when none
// was read.
export const UsageField = ({ emptyText = '', ...props }) => (
  <FunctionField sortBy="usage_start" {...props}
                 render={(r) => (r.usage_start ? `${r.usage_start} to ${r.usage_end}` : emptyText)} />
);

// An ISWC as the payer wrote it, such as T-123.456.789-0, in the form the
// song stores; blank when it isn't one.
const songIswc = (value) => {
  const iswc = (value ?? '').toUpperCase().replace(/[^T0-9]/g, '');
  return /^T[0-9]{10}$/.test(iswc) ? iswc : '';
};

// Payers often send titles in capitals; this offers a starting point the
// user can still edit.
const titleCase = (value) =>
  value.toLocaleLowerCase().replace(/(^|[\s(\-/"'])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase());

const LineSummary = ({ line }) => (
  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 2 }}>
    <Labeled label="Title"><Typography variant="body2">{line.title || '—'}</Typography></Labeled>
    <Labeled label="Writers"><Typography variant="body2">{line.writers || '—'}</Typography></Labeled>
    <Labeled label="ISWC"><Typography variant="body2">{line.iswc || '—'}</Typography></Labeled>
    <Labeled label="Work number"><Typography variant="body2">{line.work_ref || '—'}</Typography></Labeled>
  </Stack>
);

const MatchSubmit = ({ disabled }) => {
  const songId = useWatch({ name: 'song_id' });
  return (
    <Button type="submit" variant="contained" startIcon={<LinkIcon />}
            disabled={disabled || !songId}>
      Match
    </Button>
  );
};

const NewSongForm = ({ line, saving, onBack, onSave }) => {
  const [title, setTitle] = useState(line.title ?? '');
  const [iswc, setIswc] = useState(songIswc(line.iswc));
  return (
    <>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <MuiTextField autoFocus label="Title" value={title} fullWidth
                          onChange={(e) => setTitle(e.target.value)}
                          helperText="As it should appear in the catalog." />
            <Button onClick={() => setTitle(titleCase(title))} sx={{ mt: 1, whiteSpace: 'nowrap' }}>
              Title case
            </Button>
          </Stack>
          <MuiTextField label="ISWC" value={iswc} onChange={(e) => setIswc(e.target.value)}
                        helperText="Leave blank if the work has none yet." />
          {line.writers && (
            <Typography variant="body2" color="text.secondary">
              Writers on the statement: {line.writers}. Add them on the song's Writers tab
              after it is created.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" disabled={saving || !title.trim()}
                onClick={() => onSave({ title: title.trim(), iswc: iswc.trim() || null })}>
          Create song and match
        </Button>
      </DialogActions>
    </>
  );
};

// Matches an unmatched line to a song in the catalog, or creates the song
// from the line. Either way the payer's other unmatched lines with the same
// work number are matched too, by api.statement_line_write.
const MatchDialog = ({ onClose }) => {
  const line = useRecordContext();
  const canCreate = useCan('catalog.edit');
  const [creating, setCreating] = useState(false);
  const [update, { isPending: matching }] = useUpdate();
  const [create, { isPending: saving }] = useCreate();
  const notify = useNotify();
  const refresh = useRefresh();

  const fail = (err) => notify(err?.message || 'Could not match the line', { type: 'error' });
  const match = (songId, what = 'Matched') =>
    update('statement_line', { id: line.id, data: { song_id: songId }, previousData: line }, {
      mutationMode: 'pessimistic',
      onSuccess: () => {
        notify(line.work_ref
          ? `${what}, with this payer's other unmatched lines for work number ${line.work_ref}.`
          : `${what}.`);
        refresh();
        onClose();
      },
      onError: fail,
    });
  const createSong = (data) =>
    create('song', { data }, {
      onSuccess: (song) => match(song.id, `Created ${song.title} and matched`),
      onError: (err) => notify(err?.message || 'Could not create the song', { type: 'error' }),
    });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{creating ? 'New song from this line' : 'Match this line to a song'}</DialogTitle>
      {creating ? (
        <NewSongForm line={line} saving={saving || matching}
                     onBack={() => setCreating(false)} onSave={createSong} />
      ) : (
        <Form record={{ song_id: null }} onSubmit={({ song_id }) => match(song_id)}>
          <DialogContent>
            <LineSummary line={line} />
            <ReferenceInput source="song_id" reference="song" perPage={50}
                            sort={{ field: 'title', order: 'ASC' }}>
              <AutocompleteInput optionText="title" label="Song" fullWidth
                                 helperText="Type part of the title to search the catalog." />
            </ReferenceInput>
            {canCreate && (
              <>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Not in the catalog yet?
                  </Typography>
                  <Button startIcon={<AddIcon />} onClick={() => setCreating(true)}>
                    New song from this line
                  </Button>
                </Stack>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <MatchSubmit disabled={matching} />
          </DialogActions>
        </Form>
      )}
    </Dialog>
  );
};

// The Song column of a lines grid: the matched song, or a Match button that
// opens the dialog without leaving the list. Clicks stop here so the row
// click (the line's detail page) doesn't also fire, including clicks inside
// the dialog, which React passes up through the portal.
export const SongMatchField = () => {
  const record = useRecordContext();
  const canEdit = useCan('money.edit');
  const [open, setOpen] = useState(false);
  if (!record) return null;
  if (record.song_id) return <ReferenceField source="song_id" reference="song" link="edit" />;
  if (!canEdit) return <Typography variant="body2" color="text.secondary">Unmatched</Typography>;
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <Button size="small" variant="outlined" startIcon={<LinkIcon />}
              onClick={() => setOpen(true)} sx={{ whiteSpace: 'nowrap' }}>
        Match
      </Button>
      {open && <MatchDialog onClose={() => setOpen(false)} />}
    </span>
  );
};

const lineFilters = [
  <SelectInput key="m" source="song_id@is" label="Show" alwaysOn emptyText="All lines"
               choices={[{ id: 'null', name: 'Unmatched lines' }]} />,
  <ReferenceInput key="org" source="organization_id" reference="organization"
                  perPage={200} sort={{ field: 'name', order: 'ASC' }} alwaysOn>
    <AutocompleteInput optionText="name" label="Payer" />
  </ReferenceInput>,
];

const LineList = () => {
  const canEdit = useCan('money.edit');
  return (
    <List filters={lineFilters} filterDefaultValues={{ 'song_id@is': 'null' }}
          sort={{ field: 'id', order: 'DESC' }} perPage={50}>
      <Datagrid rowClick={canEdit ? 'edit' : false} bulkActionButtons={false}>
        <TextField source="payer_name" label="Payer" />
        <DateField source="statement_date" label="Statement date" />
        <UsageField label="Usage" />
        <TextField source="title" emptyText="" />
        <TextField source="writers" emptyText="" />
        <TextField source="work_ref" label="Work number" emptyText="" />
        <FunctionField source="amount" label="Amount"
                       render={(r) => `${Number(r.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${r.currency_code}`} />
        <SongMatchField label="Song" sortBy="song_id" />
        <MatchMethodField label="Matched by" />
      </Datagrid>
    </List>
  );
};

const RawRow = () => {
  const record = useRecordContext();
  if (!record?.data) return null;
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: 900 }}>
      <Table size="small">
        <TableBody>
          {Object.entries(record.data).map(([k, v]) => (
            <TableRow key={k}>
              <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{k}</TableCell>
              <TableCell>{v}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const LineToolbar = () => {
  const navigate = useNavigate();
  return (
    <Toolbar>
      <SaveButton mutationOptions={{ onSuccess: () => navigate(-1) }} type="button" />
    </Toolbar>
  );
};

const LineEdit = () => (
  <Edit transform={({ song_id }) => ({ song_id: song_id || null })} mutationMode="pessimistic">
    <SimpleForm toolbar={<LineToolbar />}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
        <Labeled label="Payer"><TextField source="payer_name" /></Labeled>
        <Labeled label="Statement date"><DateField source="statement_date" /></Labeled>
        <Labeled label="Usage"><UsageField emptyText="—" /></Labeled>
        <Labeled label="Row"><NumberField source="row_number" /></Labeled>
        <Labeled label="Amount">
          <FunctionField render={(r) => `${r.amount} ${r.currency_code}`} />
        </Labeled>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
        <Labeled label="Title"><TextField source="title" emptyText="—" /></Labeled>
        <Labeled label="Writers"><TextField source="writers" emptyText="—" /></Labeled>
        <Labeled label="ISWC"><TextField source="iswc" emptyText="—" /></Labeled>
        <Labeled label="Work number"><TextField source="work_ref" emptyText="—" /></Labeled>
      </Stack>
      <ReferenceInput source="song_id" reference="song" perPage={500}
                      sort={{ field: 'title', order: 'ASC' }}>
        <AutocompleteInput optionText="title" label="Song"
                           helperText="Choosing a song also matches every other unmatched line from this payer with the same work number. Clear it to unmatch this line."
                           sx={{ width: { xs: '100%', md: 480 } }} />
      </ReferenceInput>
      <Typography variant="subtitle2" sx={{ mt: 2 }}>The row as imported</Typography>
      <RawRow />
    </SimpleForm>
  </Edit>
);

export default { list: LineList, edit: LineEdit };
