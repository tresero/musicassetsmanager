import {
  ArrayInput, SimpleFormIterator, TextInput, NumberInput, BooleanInput,
  ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { Box } from '@mui/material';
import { AudioUploadInput } from './AudioUploadInput';
import { FileLink } from './FileLink';
import { DurationInput } from './DurationInput';
import { QuickCreateName } from './quickCreate';
import { byName } from './vocab';

/*
 * One block per file rather than one long strip, grouped by what the
 * fields are for: the file itself, where it lives, what the header says
 * about it, and anything else worth noting.
 *
 * Inputs nested in layout boxes still resolve to audio_files.N.field,
 * because each iterator row provides its own source context.
 */

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

export const AudioFilesInput = () => (
  <ArrayInput source="audio_files" label={false}
              helperText="Drop a file on a row; its format, sample rate, bit depth, bit rate, channels, and length are read from it. Stems can be dropped one at a time or as a zip.">
    <SimpleFormIterator sx={blockSx} disableReordering>

      {/* the file */}
      <Box sx={row}>
        <AudioUploadInput scoped />
        <FileLink scoped />
        <ReferenceInput source="file_type_id" reference="audio_file_type"
                        perPage={100} sort={{ field: 'name', order: 'ASC' }}>
          <AutocompleteInput optionText="name" label="Type"
                             filterToQuery={byName}
                             create={<QuickCreateName resource="audio_file_type" />}
                             createLabel="Type to search or add a type"
                             helperText={false}
                             sx={{ width: { xs: '100%', md: 180 } }} />
        </ReferenceInput>
        <TextInput source="title" label="Description" helperText={false}
                   placeholder="For a stem, which one: drums, bass, vocals"
                   sx={{ flex: '1 1 240px' }} />
      </Box>

      {/* where it lives */}
      <TextInput source="storage_uri" label="Location" helperText={false}
                 fullWidth />

      {/* what the header says */}
      <Box sx={row}>
        <TextInput source="format" label="Format" helperText={false}
                   sx={{ width: { xs: '100%', md: 110 } }} />
        <BooleanInput source="is_lossless" label="Lossless" helperText={false} />
        <NumberInput source="sample_rate" label="Sample rate (Hz)"
                     helperText={false}
                     sx={{ width: { xs: '100%', md: 160 } }} />
        <NumberInput source="bit_depth" label="Bit depth" helperText={false}
                     sx={{ width: { xs: '100%', md: 110 } }} />
        <NumberInput source="bit_rate_kbps" label="Bit rate (kbps)"
                     helperText={false}
                     sx={{ width: { xs: '100%', md: 150 } }} />
        <NumberInput source="channels" label="Channels" helperText={false}
                     sx={{ width: { xs: '100%', md: 110 } }} />
        <DurationInput label="Duration"
                       sx={{ width: { xs: '100%', md: 120 } }} />
      </Box>

      <TextInput source="notes" label="Note" helperText={false} fullWidth />
    </SimpleFormIterator>
  </ArrayInput>
);
