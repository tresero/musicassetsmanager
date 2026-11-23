import { useState } from 'react';
import { ArrayInput, TextInput, useNotify, useRecordContext } from 'react-admin';
import { useFormContext } from 'react-hook-form';
import { Box, Button, Typography } from '@mui/material';
import Download from '@mui/icons-material/Download';
import { DropZone } from './DropZone';
import { FileLink } from './FileLink';
import { AudioFilePlayer, RemoveAndPlay, useAudioFileTypes } from './AudioPlayer';
import { readAudio, audioRow } from './AudioUploadInput';
import { uploadFile, zipUrl } from './uploadClient';
import { AudioDetails } from './audioFilesTab';
import { RowIterator } from './shared';
import { trackTitle, findStored, sizeText } from '../audioFiles';

const SETS = {
  stems: {
    source: 'stem_files',
    type: 'Stem',
    one: 'stem',
    many: 'stems',
    help: 'Each stem as its own file: drums, bass, vocals. Drop one or many at once; each is named from its file name and can be renamed. Any stem makes the pitch comment say Stems Available.',
  },
  multitracks: {
    source: 'multitrack_files',
    type: 'Multitrack',
    one: 'track',
    many: 'tracks',
    help: 'The tracks of the multitrack session, each as its own file. Drop a whole folder or many files at once; each is named from its file name. Any track here makes the pitch comment say Multitracks Available.',
  },
};

/*
 * The Stems and Multitracks tabs of a recording (#43). Each file is stored
 * on its own, so it keeps its name and its audio details, and anyone looking
 * can see what there is. Download all as zip builds one zip of them as it
 * downloads (the upload service's /upload/zip).
 */
export const AudioSetInput = ({ kind }) => {
  const set = SETS[kind];
  const notify = useNotify();
  const record = useRecordContext();
  const { getValues, setValue } = useFormContext();
  const { typeId } = useAudioFileTypes();
  const [busy, setBusy] = useState(null);
  const [pct, setPct] = useState(0);

  const saved = record?.[set.source] ?? [];
  const total = saved.reduce((sum, f) => sum + (Number(f.byte_size) || 0), 0);

  const add = async (files) => {
    const type = typeId(set.type);
    if (!type) {
      notify(`The ${set.type} file type is missing from the list; ask us to add it.`, { type: 'error' });
      return;
    }
    let added = 0;
    const already = [];
    const failed = [];
    for (const [i, file] of files.entries()) {
      setBusy(`${i + 1} of ${files.length}: ${file.name}`);
      setPct(0);
      try {
        const { info } = await readAudio(file, (m) => notify(m, { type: 'warning' }));
        const plan = await uploadFile(file, {
          kind: 'audio',
          onHashProgress: (p) => setPct(Math.round(p * 50)),
          onUploadProgress: (p) => setPct(50 + Math.round(p * 50)),
        });
        if (findStored(getValues(), plan.key)) {
          already.push(file.name);
          continue;
        }
        const row = { ...audioRow(file, info, plan), title: trackTitle(file.name), file_type_id: type };
        setValue(set.source, [...(getValues(set.source) || []), row], { shouldDirty: true });
        added += 1;
      } catch (e) {
        failed.push(`${file.name} (${e.message || 'failed'})`);
      }
    }
    setBusy(null);
    const parts = [
      added ? `Added ${added} ${added === 1 ? set.one : set.many}. Save to keep them.` : null,
      already.length ? `Already on this recording: ${already.join(', ')}.` : null,
      failed.length ? `Not uploaded: ${failed.join(', ')}.` : null,
    ].filter(Boolean);
    notify(parts.join(' ') || 'Nothing added.', { type: failed.length ? 'error' : 'info', autoHideDuration: 10000 });
  };

  const download = async () => {
    try {
      window.location.assign(await zipUrl(record.id, kind));
    } catch (e) {
      notify(e.message || 'Could not make the zip', { type: 'error' });
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{set.help}</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 1 }}>
        <DropZone onFiles={add} multiple busy={!!busy} pct={pct} accept="audio/*"
                  label={busy ?? `Drop ${set.many} or click`}
                  sx={{ width: { xs: '100%', md: 360 } }} />
        <Button startIcon={<Download />} disabled={!saved.length} onClick={download}>
          {saved.length
            ? `Download all ${saved.length} as zip${total ? ` (${sizeText(total)})` : ''}`
            : 'Download all as zip'}
        </Button>
      </Box>
      <ArrayInput source={set.source} label={false} helperText={false}>
        <RowIterator disableAdd disableReordering
                     removeButton={<RemoveAndPlay player={<AudioFilePlayer />} />}>
          <TextInput source="title" label="Name" helperText={false}
                     sx={{ width: { xs: '100%', md: 280 } }} />
          <FileLink scoped sx={{ alignSelf: 'center' }} />
          <AudioDetails />
        </RowIterator>
      </ArrayInput>
    </Box>
  );
};
