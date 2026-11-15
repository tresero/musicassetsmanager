import { useEffect, useState } from 'react';
import {
  List, Datagrid, TextField, DateField, NumberField, FunctionField, ReferenceField,
  ReferenceInput, AutocompleteInput, SelectInput, Edit, SimpleForm, Labeled, Toolbar,
  SaveButton, Form, useRecordContext, useUpdate, useCreate, useNotify, useRefresh,
} from 'react-admin';
import { useNavigate } from 'react-router';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableRow, Typography,
  TextField as MuiTextField, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import AddIcon from '@mui/icons-material/Add';
import { useCan } from '../permissions';
import { rpc } from '../rpc';

const methods = {
  iswc: 'ISWC',
  isrc: 'ISRC',
  upc: 'Barcode',
  work_ref: 'Work number',
  title_writer: 'Title and writer',
  title: 'Title',
  manual: 'By hand',
  not_in_catalog: 'Not in catalog',
};

// What a line can be matched to: songs on publishing statements, recordings
// or releases on master statements. The database refuses the wrong side.
const targets = {
  song: { source: 'song_id', reference: 'song', label: 'Song' },
  recording: { source: 'recording_id', reference: 'recording', label: 'Recording' },
  release: { source: 'release_id', reference: 'release', label: 'Release' },
};
const noTarget = { song_id: null, recording_id: null, release_id: null };
const targetOf = (line) =>
  (line.song_id ? 'song' : line.recording_id ? 'recording' : line.release_id ? 'release' : null);
const isMaster = (line) => line.side === 'master';

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

// The line's ISRC when it is a well-formed one the recording can store.
const recordingIsrc = (value) => (/^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/.test(value ?? '') ? value : '');

// Payers often send titles in capitals; this offers a starting point the
// user can still edit.
const titleCase = (value) =>
  value.toLocaleLowerCase().replace(/(^|[\s(\-/"'])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase());

// The identifying fields of a line, as the payer gave them.
const lineFields = (line) => (isMaster(line)
  ? [['Title', line.title], ['Release', line.release_title], ['Artist', line.artist],
     ['ISRC', line.isrc], ['Barcode', line.upc], ['Work number', line.work_ref]]
  : [['Title', line.title], ['Writers', line.writers], ['ISWC', line.iswc],
     ['Work number', line.work_ref]]);

const LineSummary = ({ line }) => (
  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 2 }}>
    {lineFields(line).map(([label, value]) => (
      <Labeled key={label} label={label}>
        <Typography variant="body2">{value || '—'}</Typography>
      </Labeled>
    ))}
  </Stack>
);

// Songs or recordings the line may be, from api.song_suggestions or
// api.recording_suggestions: similar titles, ranked higher when a writer or
// the artist is on the line. One click matches.
const Suggestions = ({ lineId, target, disabled, onPick }) => {
  const [found, setFound] = useState([]);
  const fn = target === 'song' ? 'song_suggestions' : target === 'recording' ? 'recording_suggestions' : null;
  useEffect(() => {
    let live = true;
    setFound([]);
    if (fn) {
      rpc(fn, { line_id: lineId })
        .then((list) => { if (live) setFound(list ?? []); })
        .catch(() => { if (live) setFound([]); });
    }
    return () => { live = false; };
  }, [lineId, fn]);
  if (!found.length) return null;
  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <Typography variant="subtitle2">Suggested {target === 'song' ? 'songs' : 'recordings'}</Typography>
      {found.map((x) => {
        const id = x.song_id ?? x.recording_id;
        const note = target === 'song' ? x.writers : [x.artist, x.isrc].filter(Boolean).join(', ');
        return (
          <Stack key={id} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Button size="small" variant="outlined" startIcon={<LinkIcon />} disabled={disabled}
                    onClick={() => onPick(id, `Matched to ${x.title}`)}>
              Match
            </Button>
            <Typography variant="body2">
              {x.title}
              {note && <Typography component="span" variant="body2" color="text.secondary"> ({note})</Typography>}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
};

const MatchSubmit = ({ source, disabled }) => {
  const id = useWatch({ name: source });
  return (
    <Button type="submit" variant="contained" startIcon={<LinkIcon />}
            disabled={disabled || !id}>
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

const NewRecordingForm = ({ line, saving, onBack, onSave }) => {
  const [title, setTitle] = useState(line.title ?? '');
  const isrc = recordingIsrc(line.isrc);
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
          <Typography variant="body2" color="text.secondary">
            {isrc ? `ISRC ${isrc} is taken from the line.` : 'The line has no usable ISRC.'}
            {line.artist && ` Artist on the statement: ${line.artist}. Add the artist and the song it records on the recording after it is created.`}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" disabled={saving || !title.trim()}
                onClick={() => onSave({ title: title.trim(), isrc: isrc || null })}>
          Create recording and match
        </Button>
      </DialogActions>
    </>
  );
};

// The other unmatched lines a match or mark also applies to, for the
// message after saving.
const spreadNote = (line, target) => {
  if (line.work_ref) return `, with this payer's other unmatched lines for work number ${line.work_ref}`;
  if (line.isrc && (target === 'recording' || target === null)) {
    return `, with this payer's other unmatched lines for ISRC ${line.isrc}`;
  }
  if (target === null && line.title) return `, with this payer's other unmatched lines titled ${line.title}`;
  return '';
};

// Matches an unmatched line to a song (publishing statement) or a recording
// or release (master statement) in the catalog, creates one from the line,
// or marks it not in catalog (income on nothing in the catalog, such as
// cable retransmission). api.statement_line_write spreads each to the
// payer's other unmatched lines for the same work or ISRC, and gives an
// ISRC-less recording the line's ISRC.
const MatchDialog = ({ onClose }) => {
  const line = useRecordContext();
  const master = isMaster(line);
  const canCreate = useCan('catalog.edit');
  const [target, setTarget] = useState(
    master ? (!line.isrc && (line.upc || (line.release_title && !line.title)) ? 'release' : 'recording') : 'song');
  const [creating, setCreating] = useState(false);
  const [update, { isPending: matching }] = useUpdate();
  const [create, { isPending: saving }] = useCreate();
  const notify = useNotify();
  const refresh = useRefresh();
  const t = targets[target];

  const fail = (err) => notify(err?.message || 'Could not match the line', { type: 'error' });
  const save = (data, done) =>
    update('statement_line', { id: line.id, data, previousData: line }, {
      mutationMode: 'pessimistic',
      onSuccess: () => { notify(done); refresh(); onClose(); },
      onError: fail,
    });
  const match = (id, what = 'Matched') =>
    save({ ...noTarget, [t.source]: id }, `${what}${spreadNote(line, target)}.`);
  const notInCatalog = () =>
    save({ ...noTarget, match_method: 'not_in_catalog' },
         `Marked not in catalog${spreadNote(line, null)}.`);
  const createNew = (data) =>
    create(t.reference, { data }, {
      onSuccess: (made) => match(made.id, `Created ${made.title} and matched`),
      onError: (err) => notify(err?.message || `Could not create the ${target}`, { type: 'error' }),
    });

  const noun = master ? 'a recording or release' : 'a song';
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{creating ? `New ${target} from this line` : `Match this line to ${noun}`}</DialogTitle>
      {creating && target === 'song' && (
        <NewSongForm line={line} saving={saving || matching}
                     onBack={() => setCreating(false)} onSave={createNew} />
      )}
      {creating && target === 'recording' && (
        <NewRecordingForm line={line} saving={saving || matching}
                          onBack={() => setCreating(false)} onSave={createNew} />
      )}
      {!creating && (
        <Form key={target} record={noTarget} onSubmit={(v) => match(v[t.source])}>
          <DialogContent>
            <LineSummary line={line} />
            {master && (
              <ToggleButtonGroup exclusive size="small" value={target} sx={{ mb: 2 }}
                                 onChange={(e, v) => v && setTarget(v)}>
                <ToggleButton value="recording">Recording</ToggleButton>
                <ToggleButton value="release">Whole release</ToggleButton>
              </ToggleButtonGroup>
            )}
            <Suggestions lineId={line.id} target={target} disabled={matching} onPick={match} />
            <ReferenceInput source={t.source} reference={t.reference} perPage={50}
                            sort={{ field: 'title', order: 'ASC' }}>
              <AutocompleteInput optionText="title" label="Or search the catalog" fullWidth
                                 helperText={target === 'release'
                                   ? 'Type part of the release title. Use this for a line on a whole album, such as a download of it.'
                                   : 'Type part of the title.'} />
            </ReferenceInput>
            {canCreate && target !== 'release' && (
              <>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Not in the catalog yet?
                  </Typography>
                  <Button startIcon={<AddIcon />} onClick={() => setCreating(true)}>
                    New {target} from this line
                  </Button>
                </Stack>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={notInCatalog} disabled={matching} sx={{ mr: 'auto' }}>
              Not in catalog
            </Button>
            <Button onClick={onClose}>Cancel</Button>
            <MatchSubmit source={t.source} disabled={matching} />
          </DialogActions>
        </Form>
      )}
    </Dialog>
  );
};

// The Matched to column of a lines grid: the matched song, recording or
// release, or a Match button that opens the dialog without leaving the
// list. Clicks stop here so the row click (the line's detail page) doesn't
// also fire, including clicks inside the dialog, which React passes up
// through the portal.
export const MatchField = () => {
  const record = useRecordContext();
  const canEdit = useCan('money.edit');
  const [open, setOpen] = useState(false);
  if (!record) return null;
  const matched = targetOf(record);
  if (matched) {
    const t = targets[matched];
    return <ReferenceField source={t.source} reference={t.reference} link="edit" />;
  }
  if (record.match_method === 'not_in_catalog') {
    return <Typography variant="body2" color="text.secondary">Not in catalog</Typography>;
  }
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

// The writers on a publishing line, the artist on a master line.
export const WhoField = (props) => (
  <FunctionField {...props} render={(r) => (isMaster(r) ? r.artist : r.writers) ?? ''} />
);

// The payer's work number, or on a master line without one, the ISRC.
export const RefField = (props) => (
  <FunctionField {...props}
                 render={(r) => r.work_ref ?? (isMaster(r) ? r.isrc : null) ?? ''} />
);

const lineFilters = [
  <SelectInput key="m" source="match_method@is" label="Show" alwaysOn emptyText="All lines"
               choices={[{ id: 'null', name: 'Unmatched lines' }]} />,
  <ReferenceInput key="org" source="organization_id" reference="organization"
                  perPage={200} sort={{ field: 'name', order: 'ASC' }} alwaysOn>
    <AutocompleteInput optionText="name" label="Payer" />
  </ReferenceInput>,
];

const LineList = () => {
  const canEdit = useCan('money.edit');
  return (
    <List filters={lineFilters} filterDefaultValues={{ 'match_method@is': 'null' }}
          sort={{ field: 'id', order: 'DESC' }} perPage={50}>
      <Datagrid rowClick={canEdit ? 'edit' : false} bulkActionButtons={false}>
        <TextField source="payer_name" label="Payer" />
        <DateField source="statement_date" label="Statement date" />
        <UsageField label="Usage" />
        <TextField source="title" emptyText="" />
        <WhoField label="Writers or artist" />
        <RefField label="Work number or ISRC" />
        <FunctionField source="amount" label="Amount"
                       render={(r) => `${Number(r.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${r.currency_code}`} />
        <MatchField label="Matched to" />
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

// A line marked not in catalog can go back to unmatched, and an unmatched
// one can be marked, without choosing anything.
const NotInCatalogButton = () => {
  const line = useRecordContext();
  const [update, { isPending }] = useUpdate();
  const notify = useNotify();
  const navigate = useNavigate();
  if (!line || targetOf(line)) return null;
  const marked = line.match_method === 'not_in_catalog';
  const click = () =>
    update('statement_line', {
      id: line.id, previousData: line,
      data: { ...noTarget, match_method: marked ? null : 'not_in_catalog' },
    }, {
      mutationMode: 'pessimistic',
      onSuccess: () => {
        notify(marked ? 'Back to unmatched.' : 'Marked not in catalog.');
        navigate(-1);
      },
      onError: (err) => notify(err?.message || 'Could not change the line', { type: 'error' }),
    });
  return (
    <Button onClick={click} disabled={isPending}>
      {marked ? 'Not in catalog: back to unmatched' : 'Not in catalog'}
    </Button>
  );
};

const LineToolbar = () => {
  const navigate = useNavigate();
  return (
    <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <SaveButton mutationOptions={{ onSuccess: () => navigate(-1) }} type="button" />
      <NotInCatalogButton />
    </Toolbar>
  );
};

// The inputs for what the line is matched to. On a master line, choosing a
// recording clears the release and the other way round.
const TargetInputs = () => {
  const line = useRecordContext();
  const { setValue } = useFormContext();
  if (!line) return null;
  const clear = (other) => (value) => { if (value) setValue(other, null, { shouldDirty: true }); };
  const sx = { width: { xs: '100%', md: 480 } };
  if (!isMaster(line)) {
    return (
      <ReferenceInput source="song_id" reference="song" perPage={500}
                      sort={{ field: 'title', order: 'ASC' }}>
        <AutocompleteInput optionText="title" label="Song" sx={sx}
                           helperText="Choosing a song also matches every other unmatched line from this payer with the same work number. Clear it to unmatch this line." />
      </ReferenceInput>
    );
  }
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <ReferenceInput source="recording_id" reference="recording" perPage={500}
                      sort={{ field: 'title', order: 'ASC' }}>
        <AutocompleteInput optionText="title" label="Recording" sx={sx}
                           onChange={clear('release_id')}
                           helperText="Also matches this payer's other unmatched lines with the same ISRC or work number. A recording with no ISRC takes the line's." />
      </ReferenceInput>
      <ReferenceInput source="release_id" reference="release" perPage={500}
                      sort={{ field: 'title', order: 'ASC' }}>
        <AutocompleteInput optionText="title" label="or Whole release" sx={sx}
                           onChange={clear('recording_id')}
                           helperText="For a line on a whole album, such as a download of it." />
      </ReferenceInput>
    </Stack>
  );
};

const LineIdentifiers = () => {
  const line = useRecordContext();
  if (!line) return null;
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
      {lineFields(line).map(([label, value]) => (
        <Labeled key={label} label={label}>
          <Typography variant="body2">{value || '—'}</Typography>
        </Labeled>
      ))}
    </Stack>
  );
};

const LineEdit = () => (
  <Edit transform={({ song_id, recording_id, release_id }) => ({
          song_id: song_id || null, recording_id: recording_id || null, release_id: release_id || null,
        })}
        mutationMode="pessimistic">
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
      <LineIdentifiers />
      <TargetInputs />
      <Typography variant="subtitle2" sx={{ mt: 2 }}>The row as imported</Typography>
      <RawRow />
    </SimpleForm>
  </Edit>
);

export default { list: LineList, edit: LineEdit };
