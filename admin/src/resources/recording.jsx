import {
  List, Datagrid, TextField, NumberField, BooleanField, ReferenceField,
  SearchInput, Edit, Create, TabbedForm, TextInput, NumberInput,
  BooleanInput, DateInput, SelectInput, ArrayInput, SimpleFormIterator,
  ReferenceInput, AutocompleteInput, ReferenceArrayInput,
  AutocompleteArrayInput,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { EditToolbar } from './formToolbar';
import { QuickCreateName, QuickCreateContact, QuickCreateArtist } from './quickCreate';
import { DocumentsInput } from './documentsTab';
import { DurationInput } from './DurationInput';
import { AudioUploadInput } from './AudioUploadInput';
import { FileLink } from './FileLink';
import {
  versionLabels, tempos, freeText,
  byName, bySortName, byTitle,
} from './vocab';

const filters = [<SearchInput source="title@ilike" alwaysOn />];

const artistRoles = [
  { id: 'main',     name: 'Main' },
  { id: 'featured', name: 'Featured' },
];

// Shared by every array on this form: no divider between rows, and
// fields centered so a Select does not sit below an Autocomplete.
const iteratorSx = {
  '& .RaSimpleFormIterator-line': {
    borderBottom: 'none',
    paddingTop: 1,
    paddingBottom: 1,
  },
  '& .RaSimpleFormIterator-form': {
    alignItems: 'center',
  },
  '& .RaSimpleFormIterator-form .MuiFormControl-root': {
    marginTop: 0,
    marginBottom: 0,
  },
};

const RecordingList = () => (
  <List filters={filters} sort={{ field: 'title', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit">
      <TextField source="title" />
      <TextField source="version_label" label="Version" emptyText="—" />
      <TextField source="isrc" label="ISRC" emptyText="—" />
      <TextField source="duration_display" label="Length" emptyText="—" />
      <NumberField source="bpm" label="BPM" emptyText="—" />
      <BooleanField source="is_instrumental" label="Instr." />
      <BooleanField source="is_cover" label="Cover" />
      <ReferenceField source="status_id" reference="asset_status"
                      label="Status" emptyText="—" />
    </Datagrid>
  </List>
);

const RecordingForm = () => (
  <TabbedForm toolbar={<EditToolbar />}>
    <TabbedForm.Tab label="Details">
      <TextInput source="title" fullWidth
                 helperText="Leave blank to take the composition's title" />
      <AutocompleteInput source="version_label" label="Version"
                         choices={versionLabels}
                         onCreate={freeText}
                         helperText="Release is the commercial version"
                         sx={{ width: { xs: '100%', md: 240 } }} />
      <TextInput source="isrc" label="ISRC"
                 helperText="Country, registrant, five digits"
                 sx={{ width: { xs: '100%', md: 220 } }} />
      <NumberInput source="bpm" label="BPM" step={0.01}
                   sx={{ width: { xs: '100%', md: 130 } }} />
      <AutocompleteInput source="tempo" label="Tempo"
                         choices={tempos}
                         onCreate={freeText}
                         helperText="How it feels, not the BPM"
                         sx={{ width: { xs: '100%', md: 200 } }} />
      <ReferenceInput source="key_signature" reference="key_signature" perPage={50}
                      sort={{ field: 'accidentals', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Key" filterToQuery={byName}
                           sx={{ width: { xs: '100%', md: 200 } }} />
      </ReferenceInput>
      <BooleanInput source="is_instrumental" label="Instrumental" />
      <BooleanInput source="is_cover" label="Cover"
                    helperText="A recording of someone else's composition" />
      <ReferenceInput source="status_id" reference="asset_status" perPage={50}
                      sort={{ field: 'name', order: 'ASC' }}>
        <SelectInput optionText="name" label="Status"
                     sx={{ width: { xs: '100%', md: 220 } }} />
      </ReferenceInput>
      <TextInput source="description" multiline fullWidth />
      <TextInput source="keywords" fullWidth />
      <TextInput source="sounds_like" label="Sounds like" fullWidth />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Artists">
      <ArrayInput source="artists" label={false}
                  helperText="Who the record is by. Two main artists read as a duet.">
        <SimpleFormIterator inline sx={iteratorSx}>
          <ReferenceInput source="artist_id" reference="artist" perPage={200}
                          sort={{ field: 'sort_name', order: 'ASC' }}>
            <AutocompleteInput optionText="name" label="Artist"
                               filterToQuery={byName}
                               create={<QuickCreateArtist />}
                               createLabel="Type to search or add an artist"
                               helperText={false}
                               sx={{ width: { xs: '100%', md: 300 } }} />
          </ReferenceInput>
          <SelectInput source="role" label="Billing" choices={artistRoles}
                       defaultValue="main" helperText={false}
                       sx={{ width: { xs: '100%', md: 160 } }} />
          <NumberInput source="sequence" label="Order" defaultValue={1}
                       helperText={false}
                       sx={{ width: { xs: '100%', md: 100 } }} />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Songs">
      <ArrayInput source="songs" label={false}
                  helperText="More than one for a medley or mashup">
        <SimpleFormIterator inline sx={iteratorSx}>
          <ReferenceInput source="song_id" reference="song" perPage={500}
                          sort={{ field: 'title', order: 'ASC' }}>
            <AutocompleteInput optionText="title" label="Composition"
                               filterToQuery={byTitle} helperText={false}
                               sx={{ width: { xs: '100%', md: 380 } }} />
          </ReferenceInput>
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Credits">
      <ArrayInput source="credits" label={false}
                  helperText="One row per person. Add all their roles and instruments to that row.">
        <SimpleFormIterator inline sx={iteratorSx}>
          <ReferenceInput source="contact_id" reference="contact" perPage={200}
                          sort={{ field: 'sort_name', order: 'ASC' }}>
            <AutocompleteInput optionText="sort_name" label="Person"
                               filterToQuery={bySortName}
                               create={<QuickCreateContact />}
                               createLabel="Type to search or add a person"
                               helperText={false}
                               sx={{ width: { xs: '100%', md: 240 } }} />
          </ReferenceInput>
          <ReferenceInput source="organization_id" reference="organization" perPage={200}
                          sort={{ field: 'name', order: 'ASC' }}>
            <AutocompleteInput optionText="name" label="or Company"
                               filterToQuery={byName}
                               create={<QuickCreateName resource="organization" />}
                               createLabel="Type to search or add a company"
                               helperText={false}
                               sx={{ width: { xs: '100%', md: 240 } }} />
          </ReferenceInput>
          <TextInput source="credited_as" label="Credited as (this recording)"
                     helperText={false}
                     placeholder="Uses the person's default"
                     sx={{ width: { xs: '100%', md: 220 } }} />
          <ReferenceArrayInput source="role_ids" reference="role" perPage={50}
                               sort={{ field: 'name', order: 'ASC' }}>
            <AutocompleteArrayInput optionText="name" label="Roles"
                                    helperText={false}
                                    sx={{ width: { xs: '100%', md: 260 } }} />
          </ReferenceArrayInput>
          <ReferenceArrayInput source="instrument_ids" reference="instrument" perPage={300}
                               sort={{ field: 'name', order: 'ASC' }}>
            <AutocompleteArrayInput optionText="name" label="Instruments"
                                    filterToQuery={byName}
                                    create={<QuickCreateName resource="instrument" />}
                                    createLabel="Type to search or add an instrument"
                                    helperText={false}
                                    sx={{ width: { xs: '100%', md: 260 } }} />
          </ReferenceArrayInput>
          <NumberInput source="share" label="Share %" step={0.0001}
                       helperText={false}
                       sx={{ width: { xs: '100%', md: 110 } }} />
          <TextInput source="performance_details" label="Performance details"
                     helperText={false}
                     sx={{ width: { xs: '100%', md: 240 } }} />
          <TextInput source="notes" label="Note" helperText={false}
                     sx={{ width: { xs: '100%', md: 220 } }} />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Tags">
      <ReferenceArrayInput source="genre_ids" reference="genre" perPage={200}
                           sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteArrayInput optionText="name" label="Genres"
                                filterToQuery={byName}
                                create={<QuickCreateName resource="genre" />} />
      </ReferenceArrayInput>
      <ReferenceArrayInput source="mood_ids" reference="mood" perPage={200}
                           sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteArrayInput optionText="name" label="Moods"
                                filterToQuery={byName}
                                create={<QuickCreateName resource="mood" />} />
      </ReferenceArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Audio">
      <ArrayInput source="audio_files" label={false}
                  helperText="Drop a file on a row and its format, sample rate, bit depth, channels, and length are read from it.">
        <SimpleFormIterator inline sx={iteratorSx}>
          <AudioUploadInput scoped />
          <FileLink scoped />
          <TextInput source="title" label="Description" helperText={false}
                     placeholder="Master, MP3 preview, stems"
                     sx={{ width: { xs: '100%', md: 220 } }} />
          <TextInput source="storage_uri" label="URI" helperText={false}
                     sx={{ width: { xs: '100%', md: 360 } }} />
          <TextInput source="format" label="Format" helperText={false}
                     sx={{ width: { xs: '100%', md: 120 } }} />
          <BooleanInput source="is_lossless" label="Lossless" helperText={false} />
          <NumberInput source="sample_rate" label="Sample rate" helperText={false}
                       sx={{ width: { xs: '100%', md: 150 } }} />
          <NumberInput source="bit_depth" label="Bit depth" helperText={false}
                       sx={{ width: { xs: '100%', md: 130 } }} />
          <NumberInput source="bit_rate_kbps" label="Bit rate" helperText={false}
                       sx={{ width: { xs: '100%', md: 130 } }} />
          <NumberInput source="channels" label="Channels" helperText={false}
                       sx={{ width: { xs: '100%', md: 120 } }} />
          <DurationInput label="Duration"
                         sx={{ width: { xs: '100%', md: 130 } }} />
          <BooleanInput source="is_preview" label="Preview" helperText={false} />
          <TextInput source="notes" label="Note" helperText={false}
                     sx={{ width: { xs: '100%', md: 220 } }} />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Master">
      <DateInput source="recorded_on" label="Recorded"
                 sx={{ width: { xs: '100%', md: 200 } }} />
      <ReferenceInput source="recorded_country" reference="country" perPage={500}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Country of first fixation"
                           filterToQuery={byName}
                           helperText="Where the master was first recorded. Decides neighboring rights eligibility in many territories."
                           sx={{ width: { xs: '100%', md: 340 } }} />
      </ReferenceInput>
      <NumberInput source="p_line_year" label="℗ year"
                   sx={{ width: { xs: '100%', md: 150 } }} />

      <ArrayInput source="owners" label="Master owners"
                  helperText="Who owns the master, and in what share. The printed P line is built from these.">
        <SimpleFormIterator inline sx={iteratorSx}>
          <ReferenceInput source="contact_id" reference="contact" perPage={200}
                          sort={{ field: 'sort_name', order: 'ASC' }}>
            <AutocompleteInput optionText="sort_name" label="Person"
                               filterToQuery={bySortName}
                               create={<QuickCreateContact />}
                               createLabel="Type to search or add a person"
                               helperText={false}
                               sx={{ width: { xs: '100%', md: 260 } }} />
          </ReferenceInput>
          <ReferenceInput source="organization_id" reference="organization" perPage={200}
                          sort={{ field: 'name', order: 'ASC' }}>
            <AutocompleteInput optionText="name" label="or Company"
                               filterToQuery={byName}
                               create={<QuickCreateName resource="organization" />}
                               createLabel="Type to search or add a company"
                               helperText={false}
                               sx={{ width: { xs: '100%', md: 260 } }} />
          </ReferenceInput>
          <NumberInput source="share" label="Share %" step={0.0001}
                       helperText={false}
                       sx={{ width: { xs: '100%', md: 110 } }} />
        </SimpleFormIterator>
      </ArrayInput>

      <TextField source="p_line" label="P line" emptyText="Add an owner to build the P line" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Notes">
      <RichTextInput source="notes" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Documents">
      <DocumentsInput />
    </TabbedForm.Tab>
  </TabbedForm>
);

const strip = ({ duration_display, owner_total, p_line,
                 created_at, updated_at, ...rest }) => rest;

export default {
  list: RecordingList,
  edit: () => <Edit transform={strip} mutationMode="pessimistic"><RecordingForm /></Edit>,
  create: () => <Create transform={strip}><RecordingForm /></Create>,
  recordRepresentation: 'title',
};
