import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useNotify } from 'react-admin';
import { useSourceContext } from 'ra-core';
import { uploadFile } from './uploadClient';
import { DropZone } from './DropZone';

// The title a new document starts with: the file's name without its
// extension, which the File name field keeps.
const titleOf = (name) => name.replace(/\.[a-z0-9]{1,10}$/i, '').trim() || name;

/*
 * Drop a file on the zone or click to pick one. It is stored under a key
 * made from its contents, so dropping the same file again reuses the
 * stored copy instead of uploading a second one. The file's own name is
 * kept in file_name, since the stored key is only its hash.
 *
 * scoped=true makes it work inside an ArrayInput row.
 */
export const FileUploadInput = ({ kind = 'documents', scoped = false }) => {
  const notify = useNotify();
  const { setValue, getValues } = useFormContext();
  const sourceCtx = useSourceContext();

  const path = (f) => (scoped && sourceCtx ? sourceCtx.getSource(f) : f);
  const storageUri = useWatch({ name: path('storage_uri') });

  const [phase, setPhase] = useState(null);
  const [pct, setPct] = useState(0);

  const upload = async ([file]) => {
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
      setValue(path('file_name'), file.name, opts);
      setValue(path('mime_type'), file.type || null, opts);
      setValue(path('byte_size'), file.size, opts);
      if (!getValues(path('title'))) setValue(path('title'), titleOf(file.name), opts);

      notify(plan.exists ? 'Already stored; linked to the existing copy. Save to record it.'
                         : 'Uploaded. Save to record it.', { type: 'info' });
    } catch (e) {
      notify(e.message || 'Upload failed', { type: 'error' });
    } finally {
      setPhase(null);
    }
  };

  return (
    <DropZone
      onFiles={upload}
      busy={!!phase}
      pct={pct}
      label={phase ?? (storageUri ? 'Drop a file to replace it, or click to browse'
                                  : 'Drop a file here, or click to browse')}
      sx={{ width: '100%', my: 1 }}
    />
  );
};
