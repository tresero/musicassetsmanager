import {
  ArrayInput, SimpleFormIterator, TextInput, NumberInput, BooleanInput,
  SelectInput, ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { QuickCreateContact } from '../../quickCreate';
import { bySortName, byCode, proOptionText, proInputText } from '../../vocab';

const WritersFields = () => (
  <ArrayInput source="writers" label={false}>
    <SimpleFormIterator inline>
      <ReferenceInput source="contact_id" reference="contact" perPage={200}
                      sort={{ field: 'sort_name', order: 'ASC' }}>
        <AutocompleteInput optionText="sort_name" label="Writer"
                           filterToQuery={bySortName}
                           create={<QuickCreateContact />}
                           createLabel="Type to search or add a person"
                           sx={{ width: 240 }} />
      </ReferenceInput>
      <ReferenceInput source="role_id" reference="role" perPage={50}
                      sort={{ field: 'name', order: 'ASC' }}>
        <SelectInput optionText="name" label="Role" sx={{ width: 150 }} />
      </ReferenceInput>
      <ReferenceInput source="pro_code" reference="pro" perPage={500}
                      sort={{ field: 'code', order: 'ASC' }}>
        <AutocompleteInput label="PRO"
                           optionText={proOptionText}
                           inputText={proInputText}
                           filterToQuery={byCode}
                           sx={{ width: 120 }} />
      </ReferenceInput>
      <NumberInput source="share" label="Share %" step={0.0001}
                   sx={{ width: 110 }} />
      <BooleanInput source="controlled" label="Controlled" />
      <TextInput source="notes" label="Note" sx={{ width: 200 }} />
    </SimpleFormIterator>
  </ArrayInput>
);

export default WritersFields;
