import {
  List, TextField, DateField, NumberField, ReferenceField, Edit,
  Create, SimpleForm, TextInput, NumberInput, SelectInput,
  ReferenceInput, ReferenceArrayInput,
  AutocompleteArrayInput,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { Box } from '@mui/material';
import { EditToolbar } from './formToolbar';
import { FileLink } from './FileLink';
import { DocumentDatesInput } from './DocumentDatesInput';
import { RegistrationInputs } from './documentsTab';
import { CatalogDatagrid, SharedListPicker, searchFilter } from './shared';

const filters = [searchFilter];


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
    <CatalogDatagrid rowClick="edit">
      <TextField source="title" />
      <TextField source="file_name" label="File name" emptyText="—" />
      <ReferenceField source="document_type_id" reference="document_type"
                      label="Type" emptyText="—" />
      <DateField source="document_date" label="Effective" emptyText="—" />
      <DateField source="signed_on" label="Signed" emptyText="—" />
      <DateField source="expires_on" label="Expires" emptyText="—" />
      <TextField source="storage_kind" label="Storage" />
    </CatalogDatagrid>
  </List>
);

const DocumentForm = () => (
  <SimpleForm toolbar={<EditToolbar />}>
    <TextInput source="title" required fullWidth />
    <ReferenceInput source="document_type_id" reference="document_type"
                    perPage={100} sort={{ field: 'name', order: 'ASC' }}>
      <SharedListPicker label="Type" helperText="What it is: a split sheet, a contract, a registration" />
    </ReferenceInput>

    <SelectInput source="storage_kind" choices={storageKinds}
                 label="Storage" defaultValue="url"
                 helperText="Where the file is kept. An upload goes to the account's storage, set in Settings." />
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 2, width: '100%' }}>
      <TextInput source="storage_uri" label="Location" required
                 helperText="URL, path, or object key depending on storage type"
                 sx={{ width: { xs: '100%', md: 600 } }} />
      <FileLink sx={{}} />
    </Box>
    <TextInput source="file_name" label="File name"
               helperText="The name the file had when it was uploaded"
               sx={{ width: { xs: '100%', md: 600 } }} />
    <RegistrationInputs otherwise={
      <TextInput source="external_ref" label="External reference"
                 helperText="Document id in Paperless or similar" />
    } />

    <DocumentDatesInput />

    <ReferenceArrayInput source="song_ids" reference="song" perPage={500}
                         sort={{ field: 'title', order: 'ASC' }}>
      <AutocompleteArrayInput optionText="title" label="Compositions"
                              helperText="What this document is about. It shows on the Documents tab of each one chosen here." />
    </ReferenceArrayInput>

    <ReferenceArrayInput source="recording_ids" reference="recording" perPage={500}
                         sort={{ field: 'title', order: 'ASC' }}>
      <AutocompleteArrayInput optionText="title" label="Recordings" />
    </ReferenceArrayInput>

    <ReferenceArrayInput source="contact_ids" reference="contact" perPage={200}
                         sort={{ field: 'sort_name', order: 'ASC' }}>
      <AutocompleteArrayInput optionText="sort_name" label="People" />
    </ReferenceArrayInput>

    <ReferenceArrayInput source="organization_ids" reference="organization"
                         perPage={200} sort={{ field: 'name', order: 'ASC' }}>
      <AutocompleteArrayInput optionText="name" label="Companies" />
    </ReferenceArrayInput>

    <TextInput source="mime_type" label="MIME type" helperText="The file's type, filled in on upload" />
    <NumberInput source="byte_size" label="Size (bytes)" helperText="Filled in on upload" />
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
