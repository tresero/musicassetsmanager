import {
  ArrayInput, TextInput, ReferenceInput,
} from 'react-admin';
import { useSourceContext } from 'ra-core';
import { useWatch } from 'react-hook-form';
import { Box, Typography } from '@mui/material';
import { AudioUploadInput } from './AudioUploadInput';
import { FileLink } from './FileLink';
import { AudioFilePlayer, RemoveAndPlay } from './AudioPlayer';
import { formatDuration } from './DurationInput';
import { SharedListPicker, BlockIterator } from './shared';
import { sizeText } from '../audioFiles';

const row = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 2,
  width: '100%',
};

const DETAILS = ['format', 'is_lossless', 'sample_rate', 'bit_depth',
                 'bit_rate_kbps', 'channels', 'duration_ms', 'byte_size'];

const channelText = (n) => (n === 1 ? 'mono' : n === 2 ? 'stereo' : `${n} channels`);

// A row's technical details, read from the file's header when it is
// dropped and shown read only: format, lossless, sample rate, bit depth,
// bit rate, channels and length.
export const AudioDetails = () => {
  const ctx = useSourceContext();
  const [format, lossless, rate, bits, kbps, channels, ms, size] =
    useWatch({ name: DETAILS.map((f) => ctx.getSource(f)) });
  const parts = [
    format,
    lossless === true ? 'lossless' : lossless === false ? 'lossy' : null,
    rate ? `${Number(rate) / 1000} kHz` : null,
    bits ? `${bits}-bit` : null,
    kbps ? `${kbps} kbps` : null,
    channels ? channelText(Number(channels)) : null,
    formatDuration(ms) || null,
    sizeText(size),
  ].filter(Boolean);
  return (
    <Typography variant="body2" color="text.secondary">
      {parts.length ? parts.join(' · ') : 'Read from the file when it is dropped'}
    </Typography>
  );
};

export const AudioFilesInput = () => (
  <ArrayInput source="audio_files" label={false}
              helperText="Drop a file on a row; its name, format, sample rate, bit depth, bit rate, channels, and length are read from it. Stems and the multitrack session have tabs of their own. The type decides what the pitch comment offers: any type other than Full Mix adds Alts Available.">
    <BlockIterator disableReordering
                        removeButton={<RemoveAndPlay player={<AudioFilePlayer />} />}>

      <Box sx={row}>
        <AudioUploadInput scoped />
        <FileLink scoped sx={{ alignSelf: 'center' }} />
        <ReferenceInput source="file_type_id" reference="audio_file_type"
                        perPage={100} sort={{ field: 'name', order: 'ASC' }}>
          <SharedListPicker label="Type"
                             helperText={false}
                             sx={{ width: { xs: '100%', md: 180 } }} />
        </ReferenceInput>
        <TextInput source="title" label="Description" helperText={false}
                   placeholder="For a stem, which one: drums, bass, vocals"
                   sx={{ flex: '1 1 240px' }} />
      </Box>

      <Box sx={row}>
        <TextInput source="file_name" label="File name" helperText={false}
                   sx={{ flex: '1 1 240px' }} />
        <TextInput source="storage_uri" label="Location" helperText={false} readOnly
                   sx={{ flex: '2 1 360px' }} />
      </Box>

      <AudioDetails />

      <TextInput source="notes" label="Note" helperText={false} fullWidth />
    </BlockIterator>
  </ArrayInput>
);