import { ReferenceArrayInput, AutocompleteArrayInput } from 'react-admin';
import { QuickCreateDocument } from './quickCreate';

const byDocTitle = (q) => ({ 'title@ilike': `*${q}*` });

export const DocumentsInput = ({ label = 'Documents' }) => (
  <ReferenceArrayInput source="document_ids" reference="document"
                       perPage={500} sort={{ field: 'title', order: 'ASC' }}>
    <AutocompleteArrayInput optionText="title" label={label}
                            filterToQuery={byDocTitle}
                            create={<QuickCreateDocument />}
                            createLabel="Type to search or add a document" />
  </ReferenceArrayInput>
);