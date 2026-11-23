import {
  List, DataTable, TextField, BooleanField, DateField, Edit, Create,
  TabbedForm, TextInput, NumberInput, BooleanInput,
  SelectInput, ArrayInput, ReferenceInput,
  AutocompleteInput, ReferenceArrayInput, AutocompleteArrayInput,
  NullableBooleanInput, useRecordContext, required, useGetOne,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { useWatch, useFormState } from 'react-hook-form';
import { Typography } from '@mui/material';
import { EditToolbar } from './formToolbar';
import { PersonOrCompanyInput, ArtistInput } from './partyInputs';
import { IsrcInput, IsrcArrayInput } from './codeInputs';
import { DocumentsInput } from './documentsTab';
import { AudioFilesInput } from './audioFilesTab';
import { RepresentationsInput } from './representationsTab';
import { PitchCommentInput } from './PitchCommentInput';
import { versionLabels, tempos, freeText, parentalWarnings } from './vocab';
import {
  CatalogDataTable, SharedListPicker, CountryInput, LanguageInput, CopyrightInputs, registrationText, searchFilter, lyricsFilter, RowIterator, StartHere, CloseLyricsNotice,
} from './shared';
import { ChangeHistory } from './changeHistory';
import { RecordingLyricsInput } from './recordingLyrics';
import { useDefaultParentalWarning } from '../permissions';
import { ListActions } from './listActions';

const filters = [
  searchFilter,
  lyricsFilter,
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
const hiddenColumns = [
  'song_titles', 'bpm', 'tempo', 'key_signature', 'language_name',
  'is_instrumental', 'is_cover', 'multitracks_available', 'parental_warning',
  'easy_clear', 'pitch_contact_used', 'p_line', 'owner_total',
  'recorded_country', 'theme_names',
  'created_at', 'updated_at',
];

const RecordingList = () => (
  <List filters={filters} actions={<ListActions />}
        sort={{ field: 'title', order: 'ASC' }} perPage={50}
        empty={<StartHere />}>
    <CloseLyricsNotice />
    <CatalogDataTable rowClick="edit" hiddenColumns={hiddenColumns}>
      <DataTable.Col source="title" />
      <DataTable.Col source="version_label" label="Version" />
      <DataTable.Col source="artist_names" label="Artist" />
      <DataTable.Col source="song_titles" label="Composition" />
      <DataTable.Col source="isrc" label="ISRC" />
      <DataTable.Col source="duration_ms" label="Length" render={(r) => r.duration_display} />
      <DataTable.NumberCol source="bpm" label="BPM" />
      <DataTable.Col source="tempo" />
      <DataTable.Col source="theme_names" label="Themes" disableSort />
      <DataTable.Col source="key_signature" label="Key" />
      <DataTable.Col source="language_name" label="Language" />
      <DataTable.Col source="is_instrumental" label="Instrumental" field={BooleanField} />
      <DataTable.Col source="is_cover" label="Cover" field={BooleanField} />
      <DataTable.Col source="multitracks_available" label="Multitracks" field={BooleanField} />
      <DataTable.Col source="parental_warning" label="Parental warning" />
      <DataTable.Col source="status_name" label="Status" />
      <DataTable.Col source="one_stop" label="One stop" field={BooleanField} />
      <DataTable.Col source="easy_clear" label="Easy clear" field={BooleanField} />
      <DataTable.Col source="pitch_contact_used" label="Pitch contact" />
      <DataTable.Col source="p_line" label="P line" />
      <DataTable.NumberCol source="owner_total" label="Owner %" />
      <DataTable.Col source="recorded_country" label="Recorded in" />
      <DataTable.Col source="copyright_status" label="Registration" disableSort render={registrationText} />
      <DataTable.Col source="created_at" label="Added" field={DateField} />
      <DataTable.Col source="updated_at" label="Changed" field={DateField} />
    </CatalogDataTable>
  </List>
);

// A new recording starts on the explicit content from My settings; a saved
// one left blank stays blank.
const ParentalWarningInput = () => (
  <SelectInput source="parental_warning" label="Explicit content" emptyText="Not set"
               choices={parentalWarnings} defaultValue={useDefaultParentalWarning() ?? undefined}
               helperText="Asked per track by every distributor"
               sx={{ width: { xs: '100%', md: 300 } }} />
);

const RecordingForm = () => (
  <TabbedForm toolbar={<EditToolbar />}>
    <TabbedForm.Tab label="Songs">
      <ArrayInput source="songs" label={false}
                  helperText="More than one for a medley or mashup">
        <RowIterator>
          <ReferenceInput source="song_id" reference="song" perPage={500}
                          sort={{ field: 'title', order: 'ASC' }}>
            <AutocompleteInput optionText="title" label="Composition"
                               helperText={false}
                               validate={required()}
                               sx={{ width: { xs: '100%', md: 380 } }} />
          </ReferenceInput>
        </RowIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Details">
      <TextInput source="title" fullWidth
                 helperText="Leave blank to take the composition's title" />
      <AutocompleteInput source="version_label" label="Version"
                         choices={versionLabels}
                         onCreate={freeText}
                         helperText="Release is the commercial version"
                         sx={{ width: { xs: '100%', md: 240 } }} />
      <IsrcInput helperText="Paste it as written; dashes and spaces are dropped"
                 sx={{ width: { xs: '100%', md: 220 } }} />
      <IsrcArrayInput source="other_isrcs" label="Other ISRCs"
                      helperText="ISRCs this same recording also earns under, such as a reissue's. Statement lines match these too. Type one and press Enter."
                      sx={{ width: { xs: '100%', md: 520 } }} />
      <NumberInput source="bpm" label="BPM" step={0.01}
                   helperText="Beats per minute"
                   sx={{ width: { xs: '100%', md: 130 } }} />
      <AutocompleteInput source="tempo" label="Tempo"
                         choices={tempos}
                         onCreate={freeText}
                         helperText="How it feels, not the BPM"
                         sx={{ width: { xs: '100%', md: 200 } }} />
      <ReferenceInput source="key_signature" reference="key_signature" perPage={50}
                      sort={{ field: 'accidentals', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Key"
                           helperText="The key it is in"
                           sx={{ width: { xs: '100%', md: 200 } }} />
      </ReferenceInput>
      <ReferenceInput source="vocal_type_id" reference="vocal_type" perPage={50}
                      sort={{ field: 'name', order: 'ASC' }}>
        <SharedListPicker label="Vocals"
                           helperText="Who sings lead. Leave blank for an instrumental."
                           sx={{ width: { xs: '100%', md: 220 } }} />
      </ReferenceInput>
      <LanguageInput helperText="Language of the vocal. Leave blank to use the song's language."
                     sx={{ width: { xs: '100%', md: 240 } }} />
      <BooleanInput source="is_instrumental" label="Instrumental"
                    helperText="No vocals" />
      <BooleanInput source="is_cover" label="Cover"
                    helperText="A recording of someone else's composition" />
      <ParentalWarningInput />
      <BooleanInput source="easy_clear" label="Easy clear"
                    helperText="Set by hand: can be cleared quickly for sync" />
      <ReferenceInput source="status_id" reference="asset_status" perPage={50}
                      sort={{ field: 'name', order: 'ASC' }}>
        <SharedListPicker label="Status"
                     helperText="Where it stands: started, finished, pitched, released"
                     sx={{ width: { xs: '100%', md: 220 } }} />
      </ReferenceInput>
      <TextInput source="description" multiline fullWidth
                 helperText="Being phased out: move what it says into the fields above, Keywords and Sounds like. It is not in the pitch comment." />
      <TextInput source="keywords" fullWidth
                 helperText="Words a search should find that the lists don't cover, such as a genre or mood that isn't listed" />
      <TextInput source="sounds_like" label="Sounds like" fullWidth
                 helperText="Artists or tracks it sounds like, as a music supervisor would put it" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Artists">
      <ArrayInput source="artists" label={false}
                  helperText="Who the record is by. Two main artists read as a duet.">
        <RowIterator>
          <ArtistInput validate={required()} />
          <SelectInput source="role" label="Billing" choices={artistRoles}
                       defaultValue="main" helperText={false}
                       sx={{ width: { xs: '100%', md: 160 } }} />
          <NumberInput source="sequence" label="Order" defaultValue={1}
                       helperText={false}
                       sx={{ width: { xs: '100%', md: 100 } }} />
        </RowIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Credits">
      <ArrayInput source="credits" label={false}
                  helperText="One row per person, with all their roles and instruments. Leave Performed in blank when they played in the country of recording. Featured % is each band member's cut of the featured-artist royalty on this recording, as registered with SoundExchange; leave it blank for hired players. Points % is a share of master income agreed in lieu of pay. An instrument or role that isn't listed: ask us to add it.">
        <RowIterator>
          <PersonOrCompanyInput w={240} required />
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
            <SharedListPicker multiple label="Instruments"
                                    helperText={false}
                                    sx={{ width: { xs: '100%', md: 260 } }} />
          </ReferenceArrayInput>
          <NumberInput source="featured_share" label="Featured %" step={0.01}
                       helperText={false}
                       sx={{ width: { xs: '100%', md: 120 } }} />
          <NumberInput source="share" label="Points %" step={0.0001}
                       helperText={false}
                       sx={{ width: { xs: '100%', md: 110 } }} />
          <PerformedCountryInput />
          <TextInput source="notes" label="Note" helperText={false}
                     sx={{ width: { xs: '100%', md: 220 } }} />
        </RowIterator>
      </ArrayInput>
      <FeaturedTotal />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Tags">
      <ReferenceArrayInput source="genre_ids" reference="genre" perPage={200}
                           sort={{ field: 'name', order: 'ASC' }}>
        <SharedListPicker multiple label="Genres"
                          notListed="Not listed? Add it to Keywords on the Details tab, or ask us to add it to the list." />
      </ReferenceArrayInput>
      <ReferenceArrayInput source="mood_ids" reference="mood" perPage={200}
                           sort={{ field: 'name', order: 'ASC' }}>
        <SharedListPicker multiple label="Moods"
                          helperText="How it feels: triumphant, melancholy, laid back"
                          notListed="Not listed? Add it to Keywords on the Details tab, or ask us to add it to the list." />
      </ReferenceArrayInput>
      <ReferenceArrayInput source="theme_ids" reference="theme" perPage={200}
                           sort={{ field: 'name', order: 'ASC' }}>
        <SharedListPicker multiple label="Themes"
                          helperText="What it is about or the scene it fits, as a music supervisor searches: patriotic, Christmas, road trip. Goes in the pitch comment after the tempo."
                          notListed="Not listed? Add it to Keywords on the Details tab, or ask us to add it to the list." />
      </ReferenceArrayInput>
      <PitchCommentInput />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Lyrics">
      <RecordingLyricsInput />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Audio">
      <BooleanInput source="multitracks_available" label="Multitracks available"
                    helperText="Set by hand when the multitrack session can be supplied. Multitracks aren't uploaded here. Adds Multitracks Available to the pitch comment." />
      <AudioFilesInput />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Master">
      <OneStopStatus />
      <CountryInput source="recorded_country" label="Country of recording" prefill
                    helperText="Where it was mainly recorded. For a record tracked in more than one country, pick the main one."
                    sx={{ width: { xs: '100%', md: 340 } }} />
      <CountryInput source="commissioned_country" label="Country of commissioning" prefill
                    helperText="Where the original owner of the master was based when it was made: the label's country, or yours if self-released, wherever the tracks were cut. Societies such as PPL use this and the country of recording to decide eligibility for performance income."
                    sx={{ width: { xs: '100%', md: 340 } }} />
      <NumberInput source="p_line_year" label="℗ year"
                   helperText="The year the recording was first released, printed in the P line"
                   sx={{ width: { xs: '100%', md: 150 } }} />

      <ArrayInput source="owners" label="Master owners"
                  helperText="Who owns the master, and in what share. Controlled means you can license that share, by owning it or by agreement. The printed P line is built from these.">
        <RowIterator>
          <PersonOrCompanyInput required />
          <NumberInput source="share" label="Share %" step={0.0001}
                       helperText={false}
                       sx={{ width: { xs: '100%', md: 110 } }} />
          <BooleanInput source="controlled" label="Controlled" helperText={false} />
        </RowIterator>
      </ArrayInput>

      <TextField source="p_line" label="P line" emptyText="Add an owner to build the P line" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Copyright">
      <CopyrightInputs numberHelp="The sound recording's own registration, such as a US SR number" />
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

    <TabbedForm.Tab label="History">
      <ChangeHistory recordType="recording" />
    </TabbedForm.Tab>
  </TabbedForm>
);

// Where a credited performer played. Blank means the country of recording,
// shown in the empty field so the default is visible on every row.
const PerformedCountryInput = () => {
  const recorded = useWatch({ name: 'recorded_country' });
  const { data } = useGetOne('country', { id: recorded }, { enabled: !!recorded });
  return (
    <CountryInput source="performed_country" label="Performed in" helperText={false}
                  placeholder={data ? `${data.name} (recorded there)` : 'Country of recording'}
                  sx={{ width: { xs: '100%', md: 220 } }} />
  );
};

// performed_in on each credit is computed (own country, else the recording's).
const stripCredit = ({ performed_in, ...credit }) => credit;

const strip = ({ duration_display, owner_total, p_line, featured_total, pitch_comment_auto,
                 pitch_contact_used, has_pitch_contact,
                 one_stop, one_stop_reason, language_used,
                 artist_names, song_titles, status_name, language_name, copyright_status,
                 theme_names, created_at, updated_at, ...rest }) =>
  (rest.credits ? { ...rest, credits: rest.credits.map(stripCredit) } : rest);

export default {
  list: RecordingList,
  edit: () => <Edit transform={strip} mutationMode="pessimistic"><RecordingForm /></Edit>,
  create: () => <Create transform={strip}><RecordingForm /></Create>,
  recordRepresentation: 'title',
};
