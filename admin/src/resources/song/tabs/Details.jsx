import {
  TextInput, BooleanInput, ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { byName } from '../../vocab';

const DetailsFields = () => (
  <div className="form-stack">
    <div className="form-row form-row--identity">
      <TextInput source="title" required helperText={false} />
      <TextInput source="iswc" label="ISWC" helperText={false} />
      <ReferenceInput source="language_code" reference="language" perPage={300}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Language"
                           filterToQuery={byName} helperText={false} />
      </ReferenceInput>
    </div>

    <div className="form-flags">
      <BooleanInput source="exclusive_p" label="Exclusive" helperText={false} />
      <BooleanInput source="one_stop_p" label="One stop" helperText={false} />
      <BooleanInput source="public_domain_p" label="Public domain" helperText={false} />
    </div>
  </div>
);

export default DetailsFields;
