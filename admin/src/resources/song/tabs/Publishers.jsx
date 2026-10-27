import {
  ArrayInput, SimpleFormIterator, TextInput, NumberInput, BooleanInput,
  SelectInput, ReferenceInput,
  required,
} from 'react-admin';
import { PersonOrCompanyInput } from '../../partyInputs';
import { ForWriterInput } from '../../ForWriterInput';
import { PublisherProField } from '../../PublisherProField';
import { PinFirst } from '../../shared';
import { useRoleId } from '../../vocab';

// Publisher and Sub-Publisher head the role list, found by DDEX code so the
// site admin can rename them. A new row starts on Publisher.
const publisherRoles = ['MusicPublisher', 'SubPublisher'];

const PublishersFields = () => {
  const publisher = useRoleId(publisherRoles[0]);
  return (
    <ArrayInput source="publishers" label={false}
                helperText="A company, or a person who holds their own publishing.">
      <SimpleFormIterator inline>
        <PersonOrCompanyInput companyFirst companyLabel="Publisher" personLabel="or Person"
                              required />
        <PublisherProField />
        <ReferenceInput source="role_id" reference="role" perPage={50}
                        sort={{ field: 'name', order: 'ASC' }}
                        defaultValue={publisher}>
          <PinFirst pin={publisherRoles} by="ddex_code">
            <SelectInput optionText="name" label="Role" helperText={false} validate={required()}
                         sx={{ width: 150 }} />
          </PinFirst>
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
};

export default PublishersFields;
