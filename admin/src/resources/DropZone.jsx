import { useState, useRef } from 'react';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/CloudUpload';

// Every file in a dropped folder, and in the folders inside it.
const filesOfEntry = (entry) => new Promise((resolve) => {
  if (entry.isFile) {
    entry.file((f) => resolve([f]), () => resolve([]));
    return;
  }
  if (!entry.isDirectory) { resolve([]); return; }
  const reader = entry.createReader();
  const all = [];
  const next = () => reader.readEntries(async (batch) => {
    if (!batch.length) {
      const nested = await Promise.all(all.map(filesOfEntry));
      resolve(nested.flat());
      return;
    }
    all.push(...batch);
    next();
  }, () => resolve([]));
  next();
});

const droppedFiles = async (dt, multiple) => {
  if (!multiple) return Array.from(dt.files || []).slice(0, 1);
  const entries = Array.from(dt.items || [])
    .map((i) => i.webkitGetAsEntry?.())
    .filter(Boolean);
  if (!entries.length) return Array.from(dt.files || []);
  const nested = await Promise.all(entries.map(filesOfEntry));
  return nested.flat().filter((f) => !f.name.startsWith('.'));
};

/*
 * Drop files on the zone or click to pick them. onFiles gets an array: one
 * file, or with multiple every file dropped, folders included. Shows a
 * progress bar while busy.
 */
export const DropZone = ({
  onFiles, label, busy = false, pct = 0, multiple = false, accept,
  dense = false, sx,
}) => {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

  const take = (files) => {
    setOver(false);
    if (files.length) onFiles(files);
  };

  return (
    <Stack spacing={1} sx={sx}>
      <Box
        onClick={() => !busy && inputRef.current?.click()}
        onDragEnter={(e) => { stop(e); setOver(true); }}
        onDragOver={stop}
        onDragLeave={(e) => { stop(e); setOver(false); }}
        onDrop={async (e) => {
          stop(e);
          if (busy) return;
          take(await droppedFiles(e.dataTransfer, multiple));
        }}
        sx={{
          border: '2px dashed',
          borderColor: over ? 'primary.main' : 'divider',
          bgcolor: over ? 'action.hover' : 'transparent',
          borderRadius: 1,
          px: dense ? 1.5 : 2,
          py: dense ? 1 : 2,
          textAlign: 'center',
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        <UploadIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <input ref={inputRef} type="file" hidden multiple={multiple} accept={accept}
               onChange={(e) => {
                 const files = Array.from(e.target.files || []);
                 e.target.value = '';
                 take(files);
               }} />
      </Box>
      {busy && <LinearProgress variant="determinate" value={pct} />}
    </Stack>
  );
};
