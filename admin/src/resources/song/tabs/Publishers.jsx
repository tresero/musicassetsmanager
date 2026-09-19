import {
  ArrayInput, SimpleFormIterator, TextInput, NumberInput, BooleanInput,
  SelectInput, ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { QuickCreateName } from '../../quickCreate';
import { ForWriterInput } from '../../ForWriterInput';
import { PublisherProField } from '../../PublisherProField';
import { byName } from '../../vocab';

const PublishersFields = () => (
  <ArrayInput source="publishers" label={false}>
    <SimpleFormIterator inline>
      <ReferenceInput source="organization_id" reference="organization" perPage={200}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Publisher"
                           filterToQuery={byName}
                           create={<QuickCreateName resource="organization" />}
                           createLabel="Type to search or add a company"
                           sx={{ width: 240 }} />
      </ReferenceInput>
      <PublisherProField />
      <ReferenceInput source="role_id" reference="role" perPage={50}
                      sort={{ field: 'name', order: 'ASC' }}>
        <SelectInput optionText="name" label="Role" sx={{ width: 150 }} />
      </ReferenceInput>
      <ForWriterInput />
      <NumberInput source="share" label="Share %" step={0.0001}
                   sx={{ width: 110 }} />
      <BooleanInput source="controlled" label="Controlled" />
      <TextInput source="notes" label="Note" sx={{ width: 200 }} />
    </SimpleFormIterator>
  </ArrayInput>
);

export default PublishersFields;
