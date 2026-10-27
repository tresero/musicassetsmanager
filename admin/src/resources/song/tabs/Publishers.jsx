import {
  ArrayInput, SimpleFormIterator, TextInput, NumberInput, BooleanInput,
  SelectInput, ReferenceInput,
  required,
} from 'react-admin';
import { PersonOrCompanyInput } from '../../partyInputs';
import { ForWriterInput } from '../../ForWriterInput';
import { PublisherProField } from '../../PublisherProField';

const PublishersFields = () => (
  <ArrayInput source="publishers" label={false}
              helperText="A company, or a person who holds their own publishing.">
    <SimpleFormIterator inline>
      <PersonOrCompanyInput companyFirst companyLabel="Publisher" personLabel="or Person"
                            required />
      <PublisherProField />
      <ReferenceInput source="role_id" reference="role" perPage={50}
                      sort={{ field: 'name', order: 'ASC' }}>
        <SelectInput optionText="name" label="Role" helperText={false} validate={required()}
                     sx={{ width: 150 }} />
      </ReferenceInput>
      <ForWriterInput />
      <NumberInput source="share" label="Share %" step={0.0001}
                   helperText={false} sx={{ width: 110 }} />
      <BooleanInput source="controlled" label="Controlled" helperText={false} />
      <TextInput source="notes" label="Note" helperText={false}
                 sx={{ width: 220 }} />
    </SimpleFormIterator>
  </ArrayInput>
);

export default PublishersFields;
