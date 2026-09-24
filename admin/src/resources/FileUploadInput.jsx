import { useState, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useNotify } from 'react-admin';
import { useSourceContext } from 'ra-core';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/CloudUpload';
import { uploadFile } from './uploadClient';

/*
 * Drop a file on the zone or click to pick one. It is stored under a key
 * made from its contents, so dropping the same file again reuses the
 * stored copy instead of uploading a second one.
 *
 * scoped=true makes it work inside an ArrayInput row.
 */
export const FileUploadInput = ({ kind = 'documents', scoped = false }) => {
  const notify = useNotify();
  const { setValue, getValues } = useFormContext();
  const sourceCtx = useSourceContext();
  const inputRef = useRef(null);

  const path = (f) => (scoped && sourceCtx ? sourceCtx.getSource(f) : f);
  const storageUri = useWatch({ name: path('storage_uri') });

  const [phase, setPhase] = useState(null);
  const [pct, setPct] = useState(0);
  const [over, setOver] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setPct(0);
    try {
      setPhase('Checking file');
      const plan = await uploadFile(file, {
        kind,
        onHashProgress: (p) => setPct(Math.round(p * 100)),
        onUploadProgress: (p) => { setPhase('Uploading'); setPct(Math.round(p * 100)); },
      });

      const opts = { shouldDirty: true };
      setValue(path('storage_kind'), plan.backend, opts);
      setValue(path('storage_uri'), plan.key, opts);
      setValue(path('mime_type'), file.type || null, opts);
      setValue(path('byte_size'), file.size, opts);
      if (!getValues(path('title'))) setValue(path('title'), file.name, opts);

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
    <Stack spacing={1} sx={{ width: '100%', my: 1 }}>
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
          px: 2, py: 2,
          textAlign: 'center',
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        <UploadIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">
          {phase ?? (storageUri ? 'Drop a file to replace it, or click to browse'
                                : 'Drop a file here, or click to browse')}
        </Typography>
        <input ref={inputRef} type="file" hidden
               onChange={(e) => upload(e.target.files?.[0])} />
      </Box>
      {busy && <LinearProgress variant="determinate" value={pct} />}
    </Stack>
  );
};
