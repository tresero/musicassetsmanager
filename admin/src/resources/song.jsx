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
import { DocumentsInput } from './documentsTab';
import {
  derivationTypes, titleTypes, byName, bySortName, byTitle, byCode,
} from './vocab';

const filters = [<SearchInput source="title@ilike" alwaysOn />];

const proOptionText = (r) => (r ? `${r.code} — ${r.name}` : '');
const proInputText  = (r) => (r ? r.code : '');

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
      <ReferenceInput source="status_id" reference="asset_status" perPage={50}
                      sort={{ field: 'name', order: 'ASC' }}>
        <SelectInput optionText="name" label="Status" />
      </ReferenceInput>
      <ReferenceInput source="language_code" reference="language" perPage={300}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Language"
                           filterToQuery={byName} />
      </ReferenceInput>
      <ReferenceInput source="key_signature" reference="key_signature" perPage={50}
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
      <ReferenceArrayInput source="genre_ids" reference="genre" perPage={200}
                           sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteArrayInput optionText="name" label="Genres"
                                filterToQuery={byName}
                                create={<QuickCreateName resource="genre" />}
                                createLabel="Type to search or add a genre" />
      </ReferenceArrayInput>
      <ReferenceArrayInput source="mood_ids" reference="mood" perPage={200}
                           sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteArrayInput optionText="name" label="Moods"
                                filterToQuery={byName}
                                create={<QuickCreateName resource="mood" />}
                                createLabel="Type to search or add a mood" />
      </ReferenceArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Writers">
      <ArrayInput source="writers" label={false}>
        <SimpleFormIterator>
          <ReferenceInput source="contact_id" reference="contact" perPage={200}
                          sort={{ field: 'sort_name', order: 'ASC' }}>
            <AutocompleteInput optionText="sort_name" label="Writer"
                               filterToQuery={bySortName}
                               create={<QuickCreateContact />}
                               createLabel="Type to search or add a person" />
          </ReferenceInput>
          <ReferenceInput source="role_id" reference="role" perPage={50}
                          sort={{ field: 'name', order: 'ASC' }}>
            <SelectInput optionText="name" label="Role" />
          </ReferenceInput>
          <ReferenceInput source="pro_code" reference="pro" perPage={500}
                          sort={{ field: 'code', order: 'ASC' }}>
            <AutocompleteInput
              label="PRO"
              optionText={proOptionText}
              inputText={proInputText}
              filterToQuery={byCode}
              helperText="Blank fills from the writer's contact record"
            />
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
          <ReferenceInput source="organization_id" reference="organization" perPage={200}
                          sort={{ field: 'name', order: 'ASC' }}>
            <AutocompleteInput optionText="name" label="Publisher"
                               filterToQuery={byName}
                               create={<QuickCreateName resource="organization" />}
                               createLabel="Type to search or add a company" />
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
          <ReferenceInput source="pro_code" reference="pro" perPage={500}
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
          <ReferenceInput source="language_code" reference="language" perPage={300}
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

      <TextInput source="based_on" label="Based on" fullWidth
                 helperText="A source not in this catalog, e.g. America the Beautiful (Bates/Ward, PD). Leave blank for a cover: the song row is the original." />
      <ReferenceInput source="derived_from_id" reference="song" perPage={500}
                      sort={{ field: 'title', order: 'ASC' }}>
        <AutocompleteInput optionText="title" label="Derived from"
                           filterToQuery={byTitle}
                           helperText="Only when the source is a row in this catalog" />
      </ReferenceInput>
      <SelectInput source="derivation_type" choices={derivationTypes}
                   label="Derivation type"
                   helperText="Only when new authorship exists. A cover is a recording, not a new composition." />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Lyrics">
      <RichTextInput source="lyrics" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Notes">
      <RichTextInput source="notes" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Documents">
      <DocumentsInput />
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
