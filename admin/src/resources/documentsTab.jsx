import {
  ArrayInput, SimpleFormIterator, TextInput, DateInput,
  ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { FileUploadInput } from './FileUploadInput';
import { FileLink } from './FileLink';
import { QuickCreateName } from './quickCreate';

const byName = (q) => ({ 'name@ilike': `*${q}*` });

/*
 * Documents edited in place on the parent record.
 *
 * Add a row, name it, upload the file, save. Removing a row detaches the
 * document; it is not deleted, because the same split sheet may cover
 * forty other works. Anything left attached to nothing shows up under
 * Unattached documents.
 *
 * Where the file lives is decided by the account's storage settings, not
 * chosen here. The location can still be edited by hand for a file held
 * elsewhere; a web address is recorded as a URL.
 */
export const DocumentsInput = () => (
  <ArrayInput source="documents" label={false}
              helperText="Removing a row detaches the document. It is not deleted.">
    <SimpleFormIterator disableReordering>
      <TextInput source="title" label="Title" fullWidth />
      <ReferenceInput source="document_type_id" reference="document_type"
                      perPage={100} sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Type"
                           filterToQuery={byName}
                           create={<QuickCreateName resource="document_type" />}
                           sx={{ width: { xs: '100%', md: 300 } }} />
      </ReferenceInput>

      <FileUploadInput kind="documents" scoped />
      <FileLink scoped />

      <TextInput source="storage_uri" label="Location" fullWidth
                 helperText="Set by the upload. Paste a URL here for a file held elsewhere." />

      <DateInput source="document_date" label="Date"
                 sx={{ width: { xs: '100%', md: 200 } }} />
      <DateInput source="signed_on" label="Signed"
                 sx={{ width: { xs: '100%', md: 200 } }} />
      <DateInput source="expires_on" label="Expires"
                 sx={{ width: { xs: '100%', md: 200 } }} />
      <TextInput source="notes" label="Note" multiline fullWidth />
    </SimpleFormIterator>
  </ArrayInput>
);
