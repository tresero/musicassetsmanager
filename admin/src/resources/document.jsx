import {
  List, Datagrid, TextField, DateField, NumberField, ReferenceField,
  SearchInput, Edit, Create, SimpleForm, TextInput, NumberInput,
  DateInput, SelectInput, ReferenceInput, AutocompleteInput,
  ReferenceArrayInput, AutocompleteArrayInput,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { EditToolbar } from './formToolbar';
import { QuickCreateName } from './quickCreate';

const filters = [<SearchInput source="title@ilike" alwaysOn />];

const byName  = (q) => ({ 'name@ilike': `*${q}*` });
const byTitle = (q) => ({ 'title@ilike': `*${q}*` });
const bySortName = (q) => ({ 'sort_name@ilike': `*${q}*` });

const storageKinds = [
  { id: 'url',      name: 'URL' },
  { id: 'local',    name: 'Local file' },
  { id: 's3',       name: 'S3 / object storage' },
  { id: 'webdav',   name: 'WebDAV' },
  { id: 'sftp',     name: 'SFTP' },
  { id: 'external', name: 'External system' },
];

const DocumentList = () => (
  <List filters={filters} sort={{ field: 'document_date', order: 'DESC' }}
        perPage={50}>
    <Datagrid rowClick="edit">
      <TextField source="title" />
      <ReferenceField source="document_type_id" reference="document_type"
                      label="Type" emptyText="—" />
      <DateField source="document_date" label="Date" emptyText="—" />
      <DateField source="signed_on" label="Signed" emptyText="—" />
      <DateField source="expires_on" label="Expires" emptyText="—" />
      <TextField source="storage_kind" label="Storage" />
    </Datagrid>
  </List>
);

const DocumentForm = () => (
  <SimpleForm toolbar={<EditToolbar />}>
    <TextInput source="title" required fullWidth />
    <ReferenceInput source="document_type_id" reference="document_type"
                    perPage={100} sort={{ field: 'name', order: 'ASC' }}>
      <AutocompleteInput optionText="name" label="Type"
                         filterToQuery={byName}
                         create={<QuickCreateName resource="document_type" />} />
    </ReferenceInput>

    <SelectInput source="storage_kind" choices={storageKinds}
                 label="Storage" defaultValue="url" />
    <TextInput source="storage_uri" label="Location" fullWidth required
               helperText="URL, path, or object key depending on storage type" />
    <TextInput source="external_ref" label="External reference"
               helperText="Document id in Paperless or similar" />

    <DateInput source="document_date" label="Document date" />
    <DateInput source="signed_on" label="Signed" />
    <DateInput source="expires_on" label="Expires" />

    <ReferenceArrayInput source="song_ids" reference="song" perPage={500}
                         sort={{ field: 'title', order: 'ASC' }}>
      <AutocompleteArrayInput optionText="title" label="Compositions"
                              filterToQuery={byTitle} />
    </ReferenceArrayInput>

    <ReferenceArrayInput source="recording_ids" reference="recording" perPage={500}
                         sort={{ field: 'title', order: 'ASC' }}>
      <AutocompleteArrayInput optionText="title" label="Recordings"
                              filterToQuery={byTitle} />
    </ReferenceArrayInput>

    <ReferenceArrayInput source="contact_ids" reference="contact" perPage={200}
                         sort={{ field: 'sort_name', order: 'ASC' }}>
      <AutocompleteArrayInput optionText="sort_name" label="People"
                              filterToQuery={bySortName} />
    </ReferenceArrayInput>

    <ReferenceArrayInput source="organization_ids" reference="organization"
                         perPage={200} sort={{ field: 'name', order: 'ASC' }}>
      <AutocompleteArrayInput optionText="name" label="Companies"
                              filterToQuery={byName} />
    </ReferenceArrayInput>

    <TextInput source="mime_type" label="MIME type" />
    <NumberInput source="byte_size" label="Size (bytes)" />
    <RichTextInput source="notes" />
  </SimpleForm>
);

const strip = ({ created_at, updated_at, sha256, ...rest }) => rest;

export default {
  list: DocumentList,
  edit: () => <Edit transform={strip} mutationMode="pessimistic"><DocumentForm /></Edit>,
  create: () => <Create transform={strip}><DocumentForm /></Create>,
  recordRepresentation: 'title',
};
