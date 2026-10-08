import {
  List, Datagrid, TextField, NumberField, BooleanField, ReferenceField,
  SearchInput, Edit, Create, TabbedForm, TextInput, NumberInput,
  BooleanInput, DateInput, SelectInput, ArrayInput, SimpleFormIterator,
  ReferenceInput, AutocompleteInput, ReferenceArrayInput,
  AutocompleteArrayInput, NullableBooleanInput, useRecordContext,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { useWatch, useFormState } from 'react-hook-form';
import { Typography } from '@mui/material';
import { EditToolbar } from './formToolbar';
import { QuickCreateName, QuickCreateContact, QuickCreateArtist } from './quickCreate';
import { PersonOrCompanyInput } from './partyInputs';
import { DocumentsInput } from './documentsTab';
import { AudioFilesInput } from './audioFilesTab';
import { RepresentationsInput } from './representationsTab';
import { PitchCommentInput } from './PitchCommentInput';
import {
  versionLabels, tempos, freeText,
  byName, bySortName, byTitle,
} from './vocab';

const filters = [
  <SearchInput source="title@ilike" alwaysOn />,
  <NullableBooleanInput source="one_stop" label="One stop" />,
  <NullableBooleanInput source="easy_clear" label="Easy clear" />,
  <NullableBooleanInput source="has_pitch_contact" label="Has pitch contact" />,
];

// Whether the saved recording can be licensed by you alone, and if not,
// the first thing standing in the way. Computed by the database from the
// owners, the signed deals, and the compositions' publishing.
const OneStopStatus = () => {
  const record = useRecordContext();
  const { isDirty } = useFormState();
  if (!record?.id) return null;
  const pending = isDirty ? ' (as of the last save; save to recheck)' : '';
  return record.one_stop
    ? <Typography variant="body2" sx={{ color: 'success.main', mb: 1 }}>One stop{pending}</Typography>
    : <Typography variant="body2" sx={{ color: 'warning.main', mb: 1 }}>
        Not one stop: {record.one_stop_reason}{pending}
      </Typography>;
};

// Sum of the featured shares on this recording's credits. Nothing shows
// until someone has a share, since plenty of recordings are never
// registered with SoundExchange.
const FeaturedTotal = () => {
  const credits = useWatch({ name: 'credits' }) || [];
  const shares = credits.map((c) => Number(c?.featured_share)).filter((n) => !Number.isNaN(n) && n > 0);
  if (!shares.length) return null;
  const total = Math.round(shares.reduce((a, b) => a + b, 0) * 100) / 100;
  return (
    <Typography variant="body2" sx={{ mt: 1, color: total === 100 ? 'text.secondary' : 'warning.main' }}>
      Featured shares total {total}%{total === 100 ? '' : ', not 100'}
    </Typography>
  );
};

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
      <BooleanField source="one_stop" label="One stop" />
      <BooleanField source="easy_clear" label="Easy clear" />
      <BooleanField source="has_pitch_contact" label="Contact" />
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
      <ReferenceInput source="vocal_type_id" reference="vocal_type" perPage={50}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Vocals" filterToQuery={byName}
                           create={<QuickCreateName resource="vocal_type" />}
                           helperText="Who sings lead. Leave blank for an instrumental."
                           sx={{ width: { xs: '100%', md: 220 } }} />
      </ReferenceInput>
      <BooleanInput source="is_instrumental" label="Instrumental" />
      <BooleanInput source="is_cover" label="Cover"
                    helperText="A recording of someone else's composition" />
      <SelectInput source="parental_warning" label="Explicit content" emptyText="Not set"
                   choices={[
                     { id: 'NotExplicit', name: 'Not explicit' },
                     { id: 'Explicit', name: 'Explicit' },
                     { id: 'ExplicitContentEdited', name: 'Clean edit of an explicit track' },
                   ]}
                   helperText="Asked per track by every distributor"
                   sx={{ width: { xs: '100%', md: 300 } }} />
      <BooleanInput source="easy_clear" label="Easy clear"
                    helperText="Set by hand: can be cleared quickly for sync" />
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
                  helperText="One row per person, with all their roles and instruments. Featured % is each band member's cut of the featured-artist royalty on this recording, as registered with SoundExchange; leave it blank for hired players. Points % is a share of master income agreed in lieu of pay.">
        <SimpleFormIterator inline sx={iteratorSx}>
          <PersonOrCompanyInput w={240} />
          <TextInput source="credited_as" label="Credited as (this recording)"
                     helperText={false}
                     placeholder="Uses the person's default"
                     sx={{ width: { xs: '100%', md: 220 } }} />
          <ReferenceArrayInput source="role_ids" reference="recording_role" perPage={50}
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
          <NumberInput source="featured_share" label="Featured %" step={0.01}
                       helperText={false}
                       sx={{ width: { xs: '100%', md: 120 } }} />
          <NumberInput source="share" label="Points %" step={0.0001}
                       helperText={false}
                       sx={{ width: { xs: '100%', md: 110 } }} />
          <TextInput source="notes" label="Note" helperText={false}
                     sx={{ width: { xs: '100%', md: 220 } }} />
        </SimpleFormIterator>
      </ArrayInput>
      <FeaturedTotal />
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
      <PitchCommentInput />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Audio">
      <AudioFilesInput />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Master">
      <OneStopStatus />
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
                  helperText="Who owns the master, and in what share. Controlled means you can license that share, by owning it or by agreement. The printed P line is built from these.">
        <SimpleFormIterator inline sx={iteratorSx}>
          <PersonOrCompanyInput />
          <NumberInput source="share" label="Share %" step={0.0001}
                       helperText={false}
                       sx={{ width: { xs: '100%', md: 110 } }} />
          <BooleanInput source="controlled" label="Controlled" helperText={false} />
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

const strip = ({ duration_display, owner_total, p_line, featured_total, pitch_comment_auto,
                 pitch_contact_used, has_pitch_contact,
                 one_stop, one_stop_reason,
                 created_at, updated_at, ...rest }) => rest;

export default {
  list: RecordingList,
  edit: () => <Edit transform={strip} mutationMode="pessimistic"><RecordingForm /></Edit>,
  create: () => <Create transform={strip}><RecordingForm /></Create>,
  recordRepresentation: 'title',
};
