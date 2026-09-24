import { useState, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useNotify, useGetList } from 'react-admin';
import { useSourceContext } from 'ra-core';
import { parseBlob } from 'music-metadata';
import { uploadFile } from './uploadClient';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/CloudUpload';

/*
 * Drop an audio file on the row, or click to pick one.
 *
 * The file goes from the browser straight to storage, so the server never
 * sees it. The header is therefore read here, before the upload, and the
 * technical fields are filled in from it. The stored key is the file's
 * hash, so dropping the same file again reuses the stored copy. Only the header is parsed, so a
 * multi-gigabyte master reads as quickly as an MP3.
 *
 * Every file gets a bitrate. Bit depth only means something for lossless
 * audio, so a lossy file leaves it empty.
 *
 * WAV needs its own rule. music-metadata marks any WAV with a fact chunk
 * as lossy, and many DAWs write one for plain PCM; 32-bit float requires
 * it. It also reports WAVE_FORMAT_EXTENSIBLE, which Pro Tools and Logic
 * write for 24-bit, as "non-PCM". So for WAV the codec decides, and
 * duration falls back to size over byte rate when the fact chunk's sample
 * count is zero.
 *
 * If the recording has no duration yet and this is the full mix rather
 * than an alternate or a stem, the recording's duration is taken from
 * this file as well.
 *
 * A zip of stems has no header to read. It uploads anyway, typed as Stem.
 */

const extOf = (name) => (name.split('.').pop() || '').toUpperCase();

// PCM, 32-bit float, and EXTENSIBLE (tag 65534) are uncompressed.
// ADPCM, a-law, mu-law, GSM and the rest are genuinely lossy.
const WAV_LOSSLESS = /^(PCM|IEEE_FLOAT|non-PCM \(65534\))$/;

const isLossless = (f) =>
  /WAVE/i.test(f.container || '')
    ? WAV_LOSSLESS.test(f.codec || '')
    : (f.lossless ?? null);

const durationOf = (f, file) => {
  if (f.duration) return f.duration;
  if (f.bitrate) return (file.size * 8) / f.bitrate;
  return null;
};

const describe = ({ format, lossless, bits, rate, kbps }) => {
  const khz = rate ? `${+(rate / 1000).toFixed(1)} kHz` : '';
  if (lossless) return [format, bits && `${bits}-bit`, khz].filter(Boolean).join(' ');
  return [format, kbps && `${kbps} kbps`].filter(Boolean).join(' ');
};

export const AudioUploadInput = ({ scoped = false }) => {
  const notify = useNotify();
  const { setValue, getValues } = useFormContext();
  const sourceCtx = useSourceContext();
  const inputRef = useRef(null);

  const path = (f) => (scoped && sourceCtx ? sourceCtx.getSource(f) : f);
  const storageUri = useWatch({ name: path('storage_uri') });

  const { data: types = [] } = useGetList('audio_file_type', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'name', order: 'ASC' },
  });
  const typeId = (name) => types.find((t) => t.name === name)?.id ?? null;
  const typeName = (id) => types.find((t) => t.id === id)?.name ?? null;

  const [phase, setPhase] = useState(null);
  const [pct, setPct] = useState(0);
  const [over, setOver] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setPct(0);
    try {
      // 1. read the header; a zip of stems has none, and still uploads
      const ext = extOf(file.name);
      let f = {};
      if (ext !== 'ZIP') {
        try {
          ({ format: f } = await parseBlob(file, { duration: true }));
        } catch {
          f = {};
        }
      }
      const lossless = ext === 'ZIP' ? null : isLossless(f);
      const seconds = durationOf(f, file);
      const info = {
        format: extOf(file.name),
        lossless,
        rate: f.sampleRate ?? null,
        bits: lossless ? (f.bitsPerSample ?? null) : null,
        kbps: f.bitrate ? Math.round(f.bitrate / 1000) : null,
        channels: f.numberOfChannels ?? null,
        ms: seconds ? Math.round(seconds * 1000) : null,
      };

      // 2. hash, then send unless an identical file is already stored
      setPhase('Checking file');
      const plan = await uploadFile(file, {
        kind: 'audio',
        onHashProgress: (p) => setPct(Math.round(p * 100)),
        onUploadProgress: (p) => { setPhase('Uploading'); setPct(Math.round(p * 100)); },
      });

      // 4. fill the row
      const opts = { shouldDirty: true };
      setValue(path('storage_kind'), plan.backend, opts);
      setValue(path('storage_uri'), plan.key, opts);
      setValue(path('format'), info.format, opts);
      setValue(path('is_lossless'), info.lossless, opts);
      setValue(path('sample_rate'), info.rate, opts);
      setValue(path('bit_depth'), info.bits, opts);
      setValue(path('bit_rate_kbps'), info.kbps, opts);
      setValue(path('channels'), info.channels, opts);
      setValue(path('duration_ms'), info.ms, opts);
      if (!getValues(path('file_type_id'))) {
        setValue(path('file_type_id'),
                 typeId(ext === 'ZIP' ? 'Stem' : 'Full Mix'), opts);
      }
      if (!getValues(path('title'))) {
        setValue(path('title'), ext === 'ZIP' ? 'All stems' : describe(info), opts);
      }

      const isMainMix = typeName(getValues(path('file_type_id'))) === 'Full Mix';
      if (info.ms && isMainMix && !getValues('duration_ms')) {
        setValue('duration_ms', info.ms, opts);
      }

      notify(plan.exists ? 'Already stored; linked to the existing copy. Save to record it.'
                         : 'Uploaded. Save to record it.', { type: 'info' });
    } catch (e) {
      notify(e.message || 'Upload failed', { type: 'error' });
    } finally {
      setPhase(null);
      setOver(false);
    }
  };

  const busy = !!phase;
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <Stack spacing={1} sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }}>
      <Box
        onClick={() => !busy && inputRef.current?.click()}
        onDragEnter={(e) => { stop(e); setOver(true); }}
        onDragOver={stop}
        onDragLeave={(e) => { stop(e); setOver(false); }}
        onDrop={(e) => { stop(e); upload(e.dataTransfer.files?.[0]); }}
        sx={{
          border: '2px dashed',
          borderColor: over ? 'primary.main' : 'divider',
          bgcolor: over ? 'action.hover' : 'transparent',
          borderRadius: 1,
          px: 1.5, py: 1,
          textAlign: 'center',
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        <UploadIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">
          {phase ?? (storageUri ? 'Drop to replace' : 'Drop audio or click')}
        </Typography>
        <input ref={inputRef} type="file" hidden accept="audio/*,.zip"
               onChange={(e) => upload(e.target.files?.[0])} />
      </Box>
      {busy && <LinearProgress variant="determinate" value={pct} />}
    </Stack>
  );
};
