import { DateInput } from 'react-admin';
import { Box } from '@mui/material';
import { SameAsDateButton } from './shared';

// A document's three dates: effective, signed and expires. Signed is usually
// the effective date, so a button copies it across. Used on the document
// itself and in the Documents tab rows.
export const DocumentDatesInput = () => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 2, width: '100%' }}>
    <DateInput source="document_date" label="Effective date"
               helperText="When it takes effect"
               sx={{ width: { xs: '100%', md: 200 } }} />
    <DateInput source="signed_on" label="Signed"
               helperText="When the last party signed"
               sx={{ width: { xs: '100%', md: 200 } }} />
    <SameAsDateButton from="document_date" to="signed_on" label="Same as effective date" />
    <DateInput source="expires_on" label="Expires"
               helperText="Blank if it does not end"
               sx={{ width: { xs: '100%', md: 200 } }} />
  </Box>
);
