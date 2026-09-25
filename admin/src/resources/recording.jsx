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
import { AudioFilesInput } from './audioFilesTab';
import { RepresentationsInput } from './representationsTab';
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
      <AudioFilesInput />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Master">
      <ReferenceInput source="recorded_country" reference="country" perPage={500}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Country of recording"
                           filterToQuery={byName}
                           helperText="Where it was mainly recorded. For a record tracked in more than one country, pick the main one."
                           sx={{ width: { xs: '100%', md: 340 } }} />
      </ReferenceInput>
      <ReferenceInput source="commissioned_country" reference="country" perPage={500}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Country of commissioning"
                           filterToQuery={byName}
                           helperText="Where the original owner of the master was based when it was made: the label's country, or yours if self-released, wherever the tracks were cut. Societies such as PPL use this and the country of recording to decide eligibility for performance income."
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

    <TabbedForm.Tab label="Copyright">
      <TextInput source="copyright_number" label="Registration number"
                 helperText="The sound recording's own registration, such as a US SR number"
                 sx={{ width: { xs: '100%', md: 300 } }} />
      <DateInput source="copyright_date" label="Registration date"
                 sx={{ width: { xs: '100%', md: 200 } }} />
      <DateInput source="reversion_date" label="Reversion date"
                 sx={{ width: { xs: '100%', md: 200 } }} />
      <NumberInput source="reversion_lead" label="Lead (years)"
                   helperText="Notice before the reversion date"
                   sx={{ width: { xs: '100%', md: 160 } }} />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Signed">
      <RepresentationsInput />
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
