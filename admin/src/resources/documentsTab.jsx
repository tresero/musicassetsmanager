import {
  ArrayInput, SimpleFormIterator, TextInput, DateInput,
  ReferenceInput, useGetOne,
  required,
} from 'react-admin';
import { useSourceContext } from 'ra-core';
import { useWatch } from 'react-hook-form';
import { FileUploadInput } from './FileUploadInput';
import { FileLink } from './FileLink';
import { AttachDocumentInput } from './AttachDocumentInput';
import { SharedListPicker } from './shared';

/*
 * Documents edited in place on the parent record.
 *
 * Add a row, name it, upload the file, save. Or attach a document that
 * already exists from the picker above the list, so a registration covering
 * ten works is one document linked ten times, not ten copies. Removing a row detaches the
 * document; it is not deleted, because the same split sheet may cover
 * forty other works. Anything left attached to nothing shows up under
 * Unattached documents.
 *
 * Where the file lives is decided by the account's storage settings, not
 * chosen here. The location can still be edited by hand for a file held
 * elsewhere; a web address is recorded as a URL.
 */
// A Copyright Registration document carries its registration number, kept in
// the document's external reference. Its Date is the registration date. The
// number then applies to every song, recording or release the document is
// attached to, and through a release to its tracks. The type is recognized
// by its name.
const RegistrationNumberInput = () => {
  const ctx = useSourceContext();
  const typeId = useWatch({ name: ctx.getSource('document_type_id') });
  const { data: type } = useGetOne('document_type', { id: typeId }, { enabled: !!typeId });
  if (type?.name !== 'Copyright Registration') return null;
  return (
    <TextInput source="external_ref" label="Registration number"
               helperText="Such as SR 1-234-567. It applies to everything this document is attached to; the Date is the registration date."
               sx={{ width: { xs: '100%', md: 300 } }} />
  );
};

export const DocumentsInput = () => (
  <ArrayInput source="documents" label={false}
              helperText="Removing a row detaches the document. It is not deleted.">
    <AttachDocumentInput />
    <SimpleFormIterator disableReordering>
      <TextInput source="title" label="Title" fullWidth validate={required()} />
      <ReferenceInput source="document_type_id" reference="document_type"
                      perPage={100} sort={{ field: 'name', order: 'ASC' }}>
        <SharedListPicker label="Type"
                           sx={{ width: { xs: '100%', md: 300 } }} />
      </ReferenceInput>
      <RegistrationNumberInput />

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
