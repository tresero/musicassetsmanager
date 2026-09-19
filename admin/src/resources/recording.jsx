import {
  List, Datagrid, TextField, NumberField, BooleanField, ReferenceField,
  SearchInput, Edit, Create, TabbedForm, TextInput, NumberInput,
  BooleanInput, DateInput, SelectInput, ArrayInput, SimpleFormIterator,
  ReferenceInput, AutocompleteInput, ReferenceArrayInput,
  AutocompleteArrayInput,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { EditToolbar } from './formToolbar';
import { QuickCreateName, QuickCreateContact } from './quickCreate';
import { DocumentsInput } from './documentsTab';
import {
  versionLabels, tempos, freeText, byName, bySortName, byTitle,
} from './vocab';

const filters = [<SearchInput source="title@ilike" alwaysOn />];

const storageKinds = [
  { id: 'local', name: 'Local file' },
  { id: 's3',    name: 'S3 / object storage' },
  { id: 'url',   name: 'URL' },
];

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
      <TextInput source="title" required fullWidth />
      <AutocompleteInput source="version_label" label="Version"
                         choices={versionLabels}
                         onCreate={freeText}
                         helperText="Release is the commercial version" />
      <TextInput source="isrc" label="ISRC"
                 helperText="Two-letter country, three-character registrant, seven digits" />
      <NumberInput source="duration_ms" label="Duration (ms)" />
      <NumberInput source="bpm" label="BPM" step={0.01} />
      <AutocompleteInput source="tempo" label="Tempo"
                         choices={tempos}
                         onCreate={freeText}
                         helperText="How it feels, not the BPM" />
      <ReferenceInput source="key_signature" reference="key_signature" perPage={50}
                      sort={{ field: 'accidentals', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Key" filterToQuery={byName} />
      </ReferenceInput>
      <BooleanInput source="is_instrumental" label="Instrumental" />
      <BooleanInput source="is_cover" label="Cover"
                    helperText="A recording of someone else's composition" />
      <ReferenceInput source="status_id" reference="asset_status" perPage={50}
                      sort={{ field: 'name', order: 'ASC' }}>
        <SelectInput optionText="name" label="Status" />
      </ReferenceInput>
      <TextInput source="description" multiline fullWidth />
      <TextInput source="keywords" fullWidth />
      <TextInput source="sounds_like" label="Sounds like" fullWidth />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Songs">
      <ArrayInput source="songs" label={false}
                  helperText="More than one for a medley or mashup">
        <SimpleFormIterator inline>
          <ReferenceInput source="song_id" reference="song" perPage={500}
                          sort={{ field: 'title', order: 'ASC' }}>
            <AutocompleteInput optionText="title" label="Composition"
                               filterToQuery={byTitle} />
          </ReferenceInput>
          <NumberInput source="sequence" label="Seq" sx={{ width: 90 }} />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Credits">
      <ArrayInput source="credits" label={false}
                  helperText="One row per person. Add all their roles and instruments to that row.">
        <SimpleFormIterator>
          <ReferenceInput source="contact_id" reference="contact" perPage={200}
                          sort={{ field: 'sort_name', order: 'ASC' }}>
            <AutocompleteInput optionText="sort_name" label="Person"
                               filterToQuery={bySortName}
                               create={<QuickCreateContact />}
                               createLabel="Type to search or add a person" />
          </ReferenceInput>
          <ReferenceInput source="organization_id" reference="organization" perPage={200}
                          sort={{ field: 'name', order: 'ASC' }}>
            <AutocompleteInput optionText="name" label="or Company"
                               filterToQuery={byName}
                               create={<QuickCreateName resource="organization" />}
                               createLabel="Type to search or add a company" />
          </ReferenceInput>
          <ReferenceArrayInput source="role_ids" reference="role" perPage={50}
                               sort={{ field: 'name', order: 'ASC' }}>
            <AutocompleteArrayInput optionText="name" label="Roles" />
          </ReferenceArrayInput>
          <ReferenceArrayInput source="instrument_ids" reference="instrument" perPage={300}
                               sort={{ field: 'name', order: 'ASC' }}>
            <AutocompleteArrayInput optionText="name" label="Instruments"
                                    filterToQuery={byName}
                                    create={<QuickCreateName resource="instrument" />}
                                    createLabel="Type to search or add an instrument" />
          </ReferenceArrayInput>
          <NumberInput source="share" label="Share %" step={0.0001}
                       helperText="Blank for work for hire" />
          <TextInput source="performance_details" label="Performance details" />
          <TextInput source="notes" label="Note" multiline />
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
      <ArrayInput source="audio_files" label={false}>
        <SimpleFormIterator>
          <TextInput source="title" label="Label" />
          <SelectInput source="storage_kind" choices={storageKinds}
                       label="Storage" defaultValue="local" />
          <TextInput source="storage_uri" label="URI" fullWidth />
          <TextInput source="format" label="Format" helperText="WAV, FLAC, MP3" />
          <BooleanInput source="is_lossless" label="Lossless" />
          <NumberInput source="sample_rate" label="Sample rate (Hz)" />
          <NumberInput source="bit_depth" label="Bit depth"
                       helperText="Lossless only" />
          <NumberInput source="bit_rate_kbps" label="Bit rate (kbps)"
                       helperText="Lossy only" />
          <NumberInput source="channels" label="Channels" />
          <NumberInput source="duration_ms" label="Duration (ms)" />
          <BooleanInput source="is_preview" label="Preview" />
          <TextInput source="notes" label="Note" multiline />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Session">
      <DateInput source="recorded_on" label="Recorded" />
      <ReferenceInput source="recorded_country" reference="country" perPage={500}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Country recorded"
                           filterToQuery={byName}
                           helperText="Determines neighboring rights eligibility" />
      </ReferenceInput>
      <TextInput source="studio" label="Studio" fullWidth />
      <NumberInput source="p_line_year" label="℗ year" />
      <ReferenceInput source="p_line_owner_id" reference="organization" perPage={200}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="℗ owner"
                           filterToQuery={byName} />
      </ReferenceInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Notes">
      <RichTextInput source="notes" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Documents">
      <DocumentsInput />
    </TabbedForm.Tab>
  </TabbedForm>
);

const strip = ({ duration_display, created_at, updated_at, ...rest }) => rest;

export default {
  list: RecordingList,
  edit: () => <Edit transform={strip} mutationMode="pessimistic"><RecordingForm /></Edit>,
  create: () => <Create transform={strip}><RecordingForm /></Create>,
  recordRepresentation: 'title',
};