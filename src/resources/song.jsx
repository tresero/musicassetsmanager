import {
  List, Datagrid, TextField, NumberField, ReferenceField,
  SearchInput, Edit, Create, TabbedForm, TextInput, NumberInput,
  BooleanInput, DateInput, SelectInput, ArrayInput, SimpleFormIterator,
  ReferenceInput, AutocompleteInput, ReferenceArrayInput,
  AutocompleteArrayInput,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { EditToolbar } from './formToolbar';
import { QuickCreateName, QuickCreateContact } from './quickCreate';

const filters = [<SearchInput source="title@ilike" alwaysOn />];

const byName     = (q) => ({ 'name@ilike': `*${q}*` });
const bySortName = (q) => ({ 'sort_name@ilike': `*${q}*` });
const byTitle    = (q) => ({ 'title@ilike': `*${q}*` });
const byCode     = (q) => ({ 'code@ilike': `*${q}*` });

const proOptionText = (r) => (r ? `${r.code} — ${r.name}` : '');
const proInputText  = (r) => (r ? r.code : '');

const derivationTypes = [
  { id: 'cover',       name: 'Cover' },
  { id: 'arrangement', name: 'Arrangement' },
  { id: 'translation', name: 'Translation' },
  { id: 'adaptation',  name: 'Adaptation' },
  { id: 'sample',      name: 'Sample' },
];

const titleTypes = [
  { id: 'alternate',  name: 'Alternate' },
  { id: 'translated', name: 'Translated' },
  { id: 'working',    name: 'Working' },
  { id: 'formal',     name: 'Formal' },
  { id: 'part',       name: 'Part' },
];

const SongList = () => (
  <List filters={filters} sort={{ field: 'title', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit">
      <TextField source="title" />
      <TextField source="iswc" label="ISWC" emptyText="—" />
      <ReferenceField source="status_id" reference="asset_status"
                      label="Status" emptyText="—" />
      <ReferenceField source="language_code" reference="language"
                      label="Language" emptyText="—" />
      <NumberField source="writer_total" label="Writer %" />
      <NumberField source="publisher_total" label="Pub %" />
    </Datagrid>
  </List>
);

const SongForm = () => (
  <TabbedForm toolbar={<EditToolbar />}>
    <TabbedForm.Tab label="Details">
      <TextInput source="title" required fullWidth />
      <TextInput source="iswc" label="ISWC" helperText="T followed by 10 digits" />
      <ReferenceInput source="status_id" reference="asset_status"
                      sort={{ field: 'name', order: 'ASC' }}>
        <SelectInput optionText="name" label="Status" />
      </ReferenceInput>
      <ReferenceInput source="language_code" reference="language" perPage={25}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Language"
                           filterToQuery={byName} />
      </ReferenceInput>
      <ReferenceInput source="key_signature" reference="key_signature" perPage={40}
                      sort={{ field: 'accidentals', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Key"
                           filterToQuery={byName} />
      </ReferenceInput>
      <BooleanInput source="exclusive_p" label="Exclusive" />
      <BooleanInput source="one_stop_p" label="One stop"
                    helperText="All shares controlled, licensable without third-party clearance" />
      <BooleanInput source="public_domain_p" label="Public domain" />
      <TextInput source="blurb" multiline fullWidth
                 helperText="Short pitch line for supervisors" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Tags">
      <ReferenceArrayInput source="genre_ids" reference="genre" perPage={25}
                           sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteArrayInput optionText="name" label="Genres"
                                filterToQuery={byName}
                                create={<QuickCreateName resource="genre" />} />
      </ReferenceArrayInput>
      <ReferenceArrayInput source="mood_ids" reference="mood" perPage={25}
                           sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteArrayInput optionText="name" label="Moods"
                                filterToQuery={byName}
                                create={<QuickCreateName resource="mood" />} />
      </ReferenceArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Writers">
      <ArrayInput source="writers" label={false}>
        <SimpleFormIterator>
          <ReferenceInput source="contact_id" reference="contact" perPage={25}
                          sort={{ field: 'sort_name', order: 'ASC' }}>
            <AutocompleteInput optionText="sort_name" label="Writer"
                               filterToQuery={bySortName}
                               create={<QuickCreateContact />} />
          </ReferenceInput>
          <ReferenceInput source="role_id" reference="role" perPage={50}
                          sort={{ field: 'name', order: 'ASC' }}>
            <SelectInput optionText="name" label="Role" />
          </ReferenceInput>
          <NumberInput source="share" label="Share %" step={0.0001} />
          <BooleanInput source="controlled" label="Controlled"
                        helperText="You can license this share" />
          <TextInput source="notes" label="Note" multiline />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Publishers">
      <ArrayInput source="publishers" label={false}>
        <SimpleFormIterator>
          <ReferenceInput source="organization_id" reference="organization" perPage={25}
                          sort={{ field: 'name', order: 'ASC' }}>
            <AutocompleteInput optionText="name" label="Publisher"
                               filterToQuery={byName}
                               create={<QuickCreateName resource="organization" />} />
          </ReferenceInput>
          <ReferenceInput source="role_id" reference="role" perPage={50}
                          sort={{ field: 'name', order: 'ASC' }}>
            <SelectInput optionText="name" label="Role" />
          </ReferenceInput>
          <NumberInput source="share" label="Share %" step={0.0001} />
          <BooleanInput source="controlled" label="Controlled"
                        helperText="You administer this share" />
          <TextInput source="notes" label="Note" multiline />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Registrations">
      <ArrayInput source="registrations" label={false}>
        <SimpleFormIterator inline>
          <ReferenceInput source="pro_code" reference="pro" perPage={25}
                          sort={{ field: 'code', order: 'ASC' }}>
            <AutocompleteInput
              label="Society"
              optionText={proOptionText}
              inputText={proInputText}
              filterToQuery={byCode}
            />
          </ReferenceInput>
          <TextInput source="work_number" label="Work number" />
          <DateInput source="registered_on" label="Registered" />
          <TextInput source="notes" label="Note" multiline />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Alt titles">
      <ArrayInput source="titles" label={false}>
        <SimpleFormIterator inline>
          <TextInput source="title" label="Title" />
          <SelectInput source="title_type" choices={titleTypes}
                       label="Type" defaultValue="alternate" />
          <ReferenceInput source="language_code" reference="language" perPage={25}
                          sort={{ field: 'name', order: 'ASC' }}>
            <AutocompleteInput optionText="name" label="Language"
                               filterToQuery={byName} />
          </ReferenceInput>
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Copyright">
      <DateInput source="copyright_date" label="Copyright date" />
      <TextInput source="copyright_number" label="Copyright number" />
      <DateInput source="reversion_date" label="Reversion date" />
      <NumberInput source="reversion_lead" label="Reversion lead (years)" />
      <ReferenceInput source="derived_from_id" reference="song" perPage={25}
                      sort={{ field: 'title', order: 'ASC' }}>
        <AutocompleteInput optionText="title" label="Derived from"
                           filterToQuery={byTitle} />
      </ReferenceInput>
      <SelectInput source="derivation_type" choices={derivationTypes}
                   label="Derivation type" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Lyrics">
      <RichTextInput source="lyrics" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Notes">
      <RichTextInput source="notes" />
    </TabbedForm.Tab>
  </TabbedForm>
);

const strip = ({ writer_total, publisher_total,
                 created_at, updated_at, ...rest }) => rest;

export default {
  list: SongList,
  edit: () => <Edit transform={strip} mutationMode="pessimistic"><SongForm /></Edit>,
  create: () => <Create transform={strip}><SongForm /></Create>,
  recordRepresentation: 'title',
};