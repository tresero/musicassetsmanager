import {
  List, Datagrid, TextField, NumberField, DateField, SearchInput,
  Edit, Create, TabbedForm, TextInput, NumberInput, DateInput, SelectInput,
  ArrayInput, SimpleFormIterator, ReferenceInput, AutocompleteInput,
  useRecordContext, useSimpleFormIteratorItem, minValue,
} from 'react-admin';
import { useWatch } from 'react-hook-form';
import { Box, Typography, TextField as MuiTextField } from '@mui/material';
import { EditToolbar } from './formToolbar';
import { QuickCreateName, QuickCreateArtist, QuickCreateContact } from './quickCreate';
import { PersonInput, CompanyInput, PersonOrCompanyInput } from './partyInputs';
import { DocumentsInput } from './documentsTab';
import { byName, bySortName, byTitle } from './vocab';

const filters = [<SearchInput source="title@ilike" alwaysOn />];

const releaseTypes = [
  { id: 'Single', name: 'Single' },
  { id: 'EP', name: 'EP' },
  { id: 'Album', name: 'Album' },
];

const artistRoles = [
  { id: 'main', name: 'Main' },
  { id: 'featured', name: 'Featured' },
];

const digitsOnly = (v) => (v || '').replace(/[^0-9]/g, '') || null;

const recordingLabel = (r) =>
  r ? (r.version_label && r.version_label !== 'Release' ? `${r.title} (${r.version_label})` : r.title) : '';

const iteratorSx = {
  '& .RaSimpleFormIterator-line': { borderBottom: 'none', paddingTop: 1, paddingBottom: 1 },
  '& .RaSimpleFormIterator-form': { alignItems: 'center' },
  '& .RaSimpleFormIterator-form .MuiFormControl-root': { marginTop: 0, marginBottom: 0 },
};

const blockSx = {
  '& .RaSimpleFormIterator-line': {
    borderBottom: '1px solid', borderColor: 'divider', paddingTop: 2, paddingBottom: 2,
  },
  '& .RaSimpleFormIterator-form': { gap: 1.5 },
  '& .RaSimpleFormIterator-form .MuiFormControl-root': { marginTop: 0, marginBottom: 0 },
};

// Rows whose fields carry help text align to the top, so uneven help text
// lengths don't push the fields out of line.
const row = { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 2, width: '100%' };

// Status, length, and the C line are computed by the database, so they
// reflect the last save.
const ReleaseSummary = () => {
  const r = useRecordContext();
  if (!r?.id) return null;
  const parts = [r.status, `${r.track_count} track${r.track_count === 1 ? '' : 's'}`,
                 r.duration_display, r.c_line].filter(Boolean);
  return <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>{parts.join(' · ')}</Typography>;
};

// The number a track will get on save: its place among the tracks on the
// same disc, in list order. Shown so adding or reordering is visible at once.
const TrackNumber = () => {
  const { index } = useSimpleFormIteratorItem();
  const tracks = useWatch({ name: 'tracks' }) || [];
  const disc = Number(tracks[index]?.disc_number) || 1;
  const n = tracks.slice(0, index + 1)
    .filter((t) => (Number(t?.disc_number) || 1) === disc).length;
  return (
    <MuiTextField label="Track" value={disc > 1 ? `${disc}-${n}` : String(n)}
                  disabled sx={{ width: 90 }} />
  );
};

const ReleaseList = () => (
  <List filters={filters} sort={{ field: 'release_date', order: 'DESC' }} perPage={50}>
    <Datagrid rowClick="edit">
      <TextField source="title" />
      <TextField source="release_type" label="Type" />
      <TextField source="upc" label="UPC" emptyText="—" />
      <DateField source="release_date" label="Released" emptyText="—" />
      <TextField source="status" />
      <NumberField source="track_count" label="Tracks" />
      <TextField source="duration_display" label="Length" emptyText="—" />
    </Datagrid>
  </List>
);

const ReleaseForm = () => (
  <TabbedForm toolbar={<EditToolbar />}>
    <TabbedForm.Tab label="Details">
      <ReleaseSummary />
      <TextInput source="title" required fullWidth
                 helperText="The release title as stores will show it, like Con Sabor al Guauso" />
      <Box sx={row}>
        <SelectInput source="release_type" label="Type" choices={releaseTypes}
                     defaultValue="Single"
                     helperText="As stores count it: a single is 1 to 3 tracks, an EP 4 to 6, an album 7 or more or over 30 minutes"
                     sx={{ width: { xs: '100%', md: 160 } }} />
        <TextInput source="upc" label="UPC or EAN" parse={digitsOnly}
                   helperText="The barcode number for the whole release, like 196925431217. Spaces and dashes are fine; the check digit is verified on save."
                   sx={{ width: { xs: '100%', md: 240 } }} />
        <TextInput source="catalog_number" label="Catalog number"
                   helperText="Your own reference for the release, like SC-003"
                   sx={{ width: { xs: '100%', md: 200 } }} />
      </Box>
      <Box sx={row}>
        <CompanyInput source="label_id" label="Label" w={300}
                      helperText="The label it's released under; for a self-release, your own company" />
        <DateInput source="release_date" label="Original release date"
                   helperText="When it first came out; it stays the same through re-releases and distributor moves"
                   sx={{ width: { xs: '100%', md: 220 } }} />
        <ReferenceInput source="primary_genre_id" reference="genre" perPage={200}
                        sort={{ field: 'name', order: 'ASC' }}>
          <AutocompleteInput optionText="name" label="Primary genre" filterToQuery={byName}
                             helperText="The one genre stores file it under, like Latin"
                             sx={{ width: { xs: '100%', md: 260 } }} />
        </ReferenceInput>
      </Box>
      <Box sx={row}>
        <NumberInput source="c_line_year" label="© year"
                     helperText="Usually the release year"
                     sx={{ width: { xs: '100%', md: 160 } }} />
        <PersonOrCompanyInput personSource="c_line_contact_id" companySource="c_line_organization_id"
                              personLabel="© owner, a person" companyLabel="or a company" w={280}
                              personHelperText="Who owns the artwork and packaging copyright"
                              companyHelperText="Usually you or your label" />
      </Box>
      <TextInput source="notes" multiline fullWidth
                 helperText="Anything else about this release, such as a reissue history or a pending correction" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Artists">
      <ArrayInput source="artists" label={false}
                  helperText="Who the release is by, like Sin Camisas. Billing is Main for the act and Featured for a guest, shown as feat. Two main artists read as a duet; Order sets which is named first.">
        <SimpleFormIterator inline sx={iteratorSx}>
          <ReferenceInput source="artist_id" reference="artist" perPage={200}
                          sort={{ field: 'sort_name', order: 'ASC' }}>
            <AutocompleteInput optionText="name" label="Artist" filterToQuery={byName}
                               create={<QuickCreateArtist />}
                               createLabel="Type to search or add an artist"
                               helperText={false}
                               sx={{ width: { xs: '100%', md: 300 } }} />
          </ReferenceInput>
          <SelectInput source="role" label="Billing" choices={artistRoles}
                       defaultValue="main" helperText={false}
                       sx={{ width: { xs: '100%', md: 160 } }} />
          <NumberInput source="sequence" label="Order" defaultValue={1} helperText={false}
                       sx={{ width: { xs: '100%', md: 100 } }} />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Tracks">
      <ArrayInput source="tracks" label={false}
                  helperText="Each recording in playing order; use the arrows to reorder. Track numbers follow the order, counting from 1 on each disc, so two tracks can never share one. Disc stays 1 unless it's a multi-disc release.">
        <SimpleFormIterator inline sx={iteratorSx}>
          <TrackNumber />
          <ReferenceInput source="recording_id" reference="recording" perPage={500}
                          sort={{ field: 'title', order: 'ASC' }}>
            <AutocompleteInput optionText={recordingLabel} inputText={recordingLabel}
                               label="Recording" filterToQuery={byTitle}
                               helperText={false}
                               sx={{ width: { xs: '100%', md: 420 } }} />
          </ReferenceInput>
          <NumberInput source="disc_number" label="Disc" defaultValue={1} min={1} step={1}
                       validate={minValue(1, 'Discs are numbered from 1')} helperText={false}
                       sx={{ width: { xs: '100%', md: 90 } }} />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Distribution">
      <ArrayInput source="distributions" label={false}
                  helperText="Each distributor that has carried this release, kept as history when it moves. Status at the top of Details follows from these dates.">
        <SimpleFormIterator sx={blockSx} disableReordering>
          <Box sx={row}>
            <CompanyInput source="distributor_id" label="Distributor" w={280}
                          helperText="Who delivered it to stores, like Priam Digital or CD Baby" />
            <TextInput source="distributor_release_id" label="Their release ID"
                       helperText="The ID the distributor's dashboard shows for it"
                       sx={{ width: { xs: '100%', md: 200 } }} />
            <TextInput source="upc" label="Their UPC" parse={digitsOnly}
                       helperText="Only if they issued their own, different from the release's"
                       sx={{ width: { xs: '100%', md: 200 } }} />
          </Box>
          <Box sx={row}>
            <DateInput source="submitted_on" label="Submitted"
                       helperText="When you sent it to them"
                       sx={{ width: { xs: '100%', md: 180 } }} />
            <DateInput source="live_on" label="Live"
                       helperText="When it went live in stores"
                       sx={{ width: { xs: '100%', md: 180 } }} />
            <DateInput source="taken_down_on" label="Taken down"
                       helperText="When they removed it, if they did"
                       sx={{ width: { xs: '100%', md: 180 } }} />
          </Box>
          <TextInput source="notes" label="Note" fullWidth
                     helperText="Anything about this distribution, such as why it was moved" />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Documents">
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        Agreements, registrations, and cover art. Give cover art the type Cover Art, at
        least 3000 by 3000 pixels, so it can be found for delivery.
      </Typography>
      <DocumentsInput />
    </TabbedForm.Tab>
  </TabbedForm>
);

const strip = ({ status, track_count, duration_display, c_line,
                 created_at, updated_at, ...rest }) => rest;

export default {
  list: ReleaseList,
  edit: () => <Edit transform={strip} mutationMode="pessimistic"><ReleaseForm /></Edit>,
  create: () => <Create transform={strip}><ReleaseForm /></Create>,
  recordRepresentation: 'title',
};
