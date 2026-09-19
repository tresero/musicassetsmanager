import { useState, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useNotify } from 'react-admin';
import { useSourceContext } from 'ra-core';
import {
  Box, LinearProgress, Stack, Typography, Alert,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/CloudUpload';

/*
 * Drop a file on the zone or click it to pick one. Asks the upload
 * service for a destination, sends the file there, and writes the
 * resulting key into the form.
 *
 * scoped=true makes it work inside an ArrayInput row: SourceContext
 * gives the row prefix, so it writes documents.2.storage_uri rather
 * than storage_uri.
 */
export const FileUploadInput = ({ kind = 'documents', scoped = false }) => {
  const notify = useNotify();
  const { setValue } = useFormContext();
  const sourceCtx = useSourceContext();
  const inputRef = useRef(null);

  const path = (field) =>
    scoped && sourceCtx ? sourceCtx.getSource(field) : field;

  const title = useWatch({ name: path('title') });
  const storageUri = useWatch({ name: path('storage_uri') });

  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [over, setOver] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setPct(0);
    try {
      const token = localStorage.getItem('token');

      const res = await fetch('/upload/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title || file.name,
          filename: file.name,
          content_type: file.type || 'application/octet-stream',
          kind,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const plan = await res.json();

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(plan.method, plan.url);
        Object.entries(plan.headers || {}).forEach(([k, v]) =>
          xhr.setRequestHeader(k, v));
        if (plan.backend === 'local') {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          (xhr.status >= 200 && xhr.status < 300)
            ? resolve()
            : reject(new Error(`upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error('upload failed'));
        xhr.send(file);
      });

      const opts = { shouldDirty: true };
      setValue(path('storage_kind'), plan.backend, opts);
      setValue(path('storage_uri'), plan.key, opts);
      setValue(path('mime_type'), file.type || null, opts);
      setValue(path('byte_size'), file.size, opts);
      if (!title) setValue(path('title'), file.name, opts);

      notify('Uploaded. Save to record it.', { type: 'info' });
    } catch (e) {
      notify(e.message || 'Upload failed', { type: 'error' });
    } finally {
      setBusy(false);
      setOver(false);
    }
  };

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
          transition: 'border-color 120ms, background-color 120ms',
        }}
      >
        <UploadIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">
          {busy
            ? 'Uploading'
            : storageUri
              ? 'Drop a file to replace it, or click to browse'
              : 'Drop a file here, or click to browse'}
        </Typography>
        <input ref={inputRef} type="file" hidden
               onChange={(e) => upload(e.target.files?.[0])} />
      </Box>

      {busy && <LinearProgress variant="determinate" value={pct} />}

      {storageUri && !busy && (
        <Alert severity="success" sx={{ py: 0 }}>
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            {storageUri}
          </Typography>
        </Alert>
      )}
    </Stack>
  );
};