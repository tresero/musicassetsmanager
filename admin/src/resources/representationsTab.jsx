import {
  ArrayInput, SimpleFormIterator, TextInput, NumberInput, BooleanInput,
  DateInput, ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { Box } from '@mui/material';
import { QuickCreateName, QuickCreateContact } from './quickCreate';
import { byName, bySortName, byTitle } from './vocab';

const row = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 2,
  width: '100%',
};

const blockSx = {
  '& .RaSimpleFormIterator-line': {
    borderBottom: '1px solid',
    borderColor: 'divider',
    paddingTop: 2,
    paddingBottom: 2,
  },
  '& .RaSimpleFormIterator-form': {
    gap: 1.5,
  },
  '& .RaSimpleFormIterator-form .MuiFormControl-root': {
    marginTop: 0,
    marginBottom: 0,
  },
};

export const RepresentationsInput = () => (
  <ArrayInput source="representations" label={false}
              helperText="Publishers and sync agents holding rights to license this master. Leave Ends blank for a deal with no end date.">
    <SimpleFormIterator sx={blockSx} disableReordering>

      <Box sx={row}>
        <ReferenceInput source="organization_id" reference="organization" perPage={200}
                        sort={{ field: 'name', order: 'ASC' }}>
          <AutocompleteInput optionText="name" label="Agent or library"
                             filterToQuery={byName}
                             create={<QuickCreateName resource="organization" />}
                             createLabel="Type to search or add a company"
                             helperText={false}
                             sx={{ width: { xs: '100%', md: 280 } }} />
        </ReferenceInput>
        <ReferenceInput source="contact_id" reference="contact" perPage={200}
                        sort={{ field: 'sort_name', order: 'ASC' }}>
          <AutocompleteInput optionText="sort_name" label="or Person"
                             filterToQuery={bySortName}
                             create={<QuickCreateContact />}
                             createLabel="Type to search or add a person"
                             helperText={false}
                             sx={{ width: { xs: '100%', md: 240 } }} />
        </ReferenceInput>
        <BooleanInput source="is_exclusive" label="Exclusive" helperText={false} />
      </Box>

      <Box sx={row}>
        <DateInput source="signed_on" label="Signed" helperText={false}
                   sx={{ width: { xs: '100%', md: 180 } }} />
        <DateInput source="ends_on" label="Ends" helperText={false}
                   sx={{ width: { xs: '100%', md: 180 } }} />
        <NumberInput source="agent_share" label="Agent share %" step={0.01}
                     helperText={false}
                     sx={{ width: { xs: '100%', md: 150 } }} />
      </Box>

      <Box sx={row}>
        <ReferenceInput source="document_id" reference="document" perPage={500}
                        sort={{ field: 'title', order: 'ASC' }}>
          <AutocompleteInput optionText="title" label="Agreement"
                             filterToQuery={byTitle} helperText={false}
                             sx={{ width: { xs: '100%', md: 300 } }} />
        </ReferenceInput>
      </Box>

      <TextInput source="notes" label="Note" helperText={false} fullWidth />
    </SimpleFormIterator>
  </ArrayInput>
);
