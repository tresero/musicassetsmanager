import {
  ArrayInput, SimpleFormIterator, TextInput, NumberInput, BooleanInput,
  SelectInput, ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { QuickCreateContact } from '../../quickCreate';
import { bySortName, byCode, proOptionText, proInputText } from '../../vocab';

const iteratorSx = {
  '& .RaSimpleFormIterator-line': {
    borderBottom: 'none',
    paddingTop: 1,
    paddingBottom: 1,
  },
  '& .RaSimpleFormIterator-form': {
    alignItems: 'center',
  },
  '& .RaSimpleFormIterator-form .MuiFormControl-root': {
    marginTop: 0,
    marginBottom: 0,
  },
};

const WritersFields = () => (
  <ArrayInput source="writers" label={false}>
    <SimpleFormIterator inline sx={iteratorSx}>
      <ReferenceInput source="contact_id" reference="contact" perPage={200}
                      sort={{ field: 'sort_name', order: 'ASC' }}>
        <AutocompleteInput optionText="sort_name" label="Writer"
                           filterToQuery={bySortName}
                           create={<QuickCreateContact />}
                           createLabel="Type to search or add a person"
                           helperText={false}
                           sx={{ width: { xs: '100%', md: 260 } }} />
      </ReferenceInput>

      <ReferenceInput source="role_id" reference="role" perPage={50}
                      sort={{ field: 'name', order: 'ASC' }}>
        <SelectInput optionText="name" label="Role" helperText={false}
                     sx={{ width: { xs: '100%', md: 150 } }} />
      </ReferenceInput>

      <ReferenceInput source="pro_code" reference="pro" perPage={500}
                      sort={{ field: 'code', order: 'ASC' }}>
        <AutocompleteInput label="PRO"
                           optionText={proOptionText}
                           inputText={proInputText}
                           filterToQuery={byCode}
                           helperText={false}
                           sx={{ width: { xs: '100%', md: 170 } }} />
      </ReferenceInput>

      <NumberInput source="share" label="Share %" step={0.0001}
                   helperText={false}
                   sx={{ width: { xs: '100%', md: 110 } }} />

      <BooleanInput source="controlled" label="Controlled" helperText={false} />

      <TextInput source="notes" label="Note" helperText={false}
                 sx={{ width: { xs: '100%', md: 220 } }} />
    </SimpleFormIterator>
  </ArrayInput>
);

export default WritersFields;